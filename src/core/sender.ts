
import AsyncQueue from './asyncQueue';
import Transport from './transport';
import { Codec } from './codec';
import Publisher from './publisher';
import Media from './media';
import * as sdpTransform from 'sdp-transform';

import { RemoteICECandidate, StrDic, DTLSparameter } from './remoteParameters';
import { getDtls } from './utils';
import Sdp from './sdp';
import { Metadata } from './metadata';


export default class Sender extends Transport {
  pc: RTCPeerConnection;

  asyncQueue = new AsyncQueue()
  isGotDtls = false
  publishers = Array<Publisher>()

  usedMids: string[] = []
  //----- event
  onpublisher: ((publisher: Publisher) => void) | null = null
  ondtls: ((dtls: DTLSparameter) => void) | null = null
  onunpublished: ((publisher: Publisher) => void) | null = null

  constructor(id: string, remoteICECandidates: [RemoteICECandidate], remoteICEParameters: StrDic, remoteDTLSParameters: StrDic) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    this.pc = new (RTCPeerConnection as any)({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', sdpSemantics: "unified-plan", }, { optional: [{ googDscp: true }] });
  }

  publish(track: MediaStreamTrack, codecCap: Codec, metadata: Metadata, maxBitrate: number) {
    this.asyncQueue.push({ execObj: this, taskFunc: this._publishInternal, parameters: [track, codecCap, metadata, maxBitrate] });
  }

  unpublish(publisherId: string) {
    let publisher = this.publishers.find(p => p.id == publisherId);
    if (publisher) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unpublishInternal, parameters: [publisher] });
    }
  }

  getPublisher(id: string) {
    return this.publishers.find(p => p.id === id)
  }

  private async _unpublishInternal(publisher: Publisher) {
    this.pc.removeTrack(publisher.transceiver.sender);

    let localSdp = await this.pc.createOffer();

    await this.pc.setLocalDescription(localSdp);

    let localSdpObj = sdpTransform.parse(localSdp.sdp!);
    this.usedMids = localSdpObj.media.map(m => m.mid) as Array<string>

    let remoteSdp = this.generateSdp();
    await this.pc.setRemoteDescription(remoteSdp);

    if (this.onunpublished) {
      this.onunpublished(publisher);
    }
  }

  private async _publishInternal(track: MediaStreamTrack, codecCap: Codec, metadata: Metadata, maxBitrate: number) {
    const encodings = [{ maxBitrate: maxBitrate }];
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
      sendEncodings: encodings,
    });
    const publisher = new Publisher(track, transceiver, metadata);
    this.publishers.push(publisher);

    try {
      const localSdp = await this.pc.createOffer();
      await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp

      this.getLocalSdpData(publisher, localSdp, codecCap);

      let remoteSdp = this.generateSdp();

      await this.pc.setRemoteDescription(remoteSdp);

      if (this.onpublisher) {
        this.onpublisher(publisher);
      }

    } catch (e) {
      console.log(e);
    }

  }

  getLocalSdpData(publisher: Publisher, localSdp: RTCSessionDescriptionInit, codecCap: Codec) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp!);

    let mids: string[] = [];
    for (let media of localSdpObj.media) {
      mids.push(media.mid!);
      if (media.mid == publisher.mid) {
        publisher.media = Media.merge(media, codecCap, this.remoteICEParameters, this.remoteICECandidates);
      }
    }

    this.usedMids = mids;
    //remote media

    if (false === this.isGotDtls) {
      this.isGotDtls = true;
      //TODO: set
      const localDTLSParameters = getDtls(localSdpObj);

      if (localDTLSParameters && this.ondtls) {
        this.ondtls(localDTLSParameters);
      }
    }
  }

  generateSdp() {
    let sdpObj = new Sdp();
    sdpObj.fingerprint = {
      algorithm: this.remoteDTLSParameters.algorithm,
      hash: this.remoteDTLSParameters.value
    }

    for (let mid of this.usedMids) {
      let publisher = this.publishers.find(p => p.mid == String(mid))
      if (publisher && publisher.media) {
        sdpObj.medias.push(publisher.media)
      }
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'answer', sdp: sdp });

  }

}