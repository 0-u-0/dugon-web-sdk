
import AsyncQueue from './asyncQueue';
import Transport from './transport';
import { Codec } from './codec';
import Sender from './sender';
import Media from './media';
import * as sdpTransform from 'sdp-transform';

import { RemoteICECandidate, StrDic, DTLSparameter } from './remoteParameters';
import { getDtls } from './utils';
import Sdp from './sdp';
import { Metadata } from './metadata';



export default class Publisher extends Transport {
  asyncQueue = new AsyncQueue()
  isGotDtls = false
  senders = Array<Sender>()

  usedMids: string[] = []
  //----- event
  onsender: ((sender: Sender) => void) | null = null
  ondtls: ((dtls: DTLSparameter) => void) | null = null
  onunpublished: ((sender: Sender) => void) | null = null

  constructor(id: string, remoteICECandidates: [RemoteICECandidate], remoteICEParameters: StrDic, remoteDTLSParameters: StrDic) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

  }

  publish(track: MediaStreamTrack, codecCap: Codec, metadata: Metadata) {
    this.asyncQueue.push({ execObj: this, taskFunc: this._publishInternal, parameters: [track, codecCap, metadata] });
  }

  unpublish(senderId: string) {
    let sender = this.senders.find(s => s.id == senderId);
    if (sender) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unpublishInternal, parameters: [sender] });
    }
  }

  private async _unpublishInternal(sender: Sender) {
    this.pc.removeTrack(sender.transceiver.sender);

    let localSdp = await this.pc.createOffer();

    await this.pc.setLocalDescription(localSdp);

    let localSdpObj = sdpTransform.parse(localSdp.sdp!);
    this.usedMids = localSdpObj.media.map(m => m.mid) as Array<string>

    let remoteSdp = this.generateSdp();
    await this.pc.setRemoteDescription(remoteSdp);

    if (this.onunpublished) {
      this.onunpublished(sender);
    }
  }

  private async _publishInternal(track: MediaStreamTrack, codecCap: Codec, metadata: Metadata) {
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
    });
    const sender = new Sender(track, transceiver, metadata);
    this.senders.push(sender);

    try {
      const localSdp = await this.pc.createOffer();
      await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp

      this.getLocalSdpData(sender, localSdp, codecCap);

      let remoteSdp = this.generateSdp();

      await this.pc.setRemoteDescription(remoteSdp);

      if (this.onsender) {
        this.onsender(sender);
      }

    } catch (e) {
      console.log(e);
    }

  }

  getLocalSdpData(sender: Sender, localSdp: RTCSessionDescriptionInit, codecCap: Codec) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp!);

    let mids: string[] = [];
    for (let media of localSdpObj.media) {
      mids.push(media.mid!);
      if (media.mid == sender.mid) {
        sender.media = Media.merge(media, codecCap, this.remoteICEParameters, this.remoteICECandidates);
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
      let sender = this.senders.find(s => s.mid == String(mid))
      if (sender && sender.media) {
        sdpObj.medias.push(sender.media)
      }
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'answer', sdp: sdp });

  }


}