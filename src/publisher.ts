
import AsyncQueue from './asyncQueue';
import Transport from './transport';
import {Codec} from './codec';
import Sender from './sender';
import * as sdpTransform from 'sdp-transform';

import { RemoteICECandidate ,Str2StrDictionary} from './remoteParameters';


export default class Publisher extends Transport {
  asyncQueue = new AsyncQueue()
  isGotDtls = false
  senders = Array<Sender>()
  //----- event
  onsender: ((sender: Sender) => void) | null = null

  constructor(id: string, remoteICECandidates: [RemoteICECandidate], remoteICEParameters: Str2StrDictionary, remoteDTLSParameters: Str2StrDictionary) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

  }

  send(track: MediaStreamTrack, codecCap: Codec) {
    this.asyncQueue.push({ execObj: this, taskFunc: this._sendInternal, parameters: [track, codecCap] });
  }

  getLocalSdpData(sender: Sender, localSdp: RTCSessionDescriptionInit, codecCap: Codec) {
    let localSdpObj = sdpTransform.parse(localSdp.sdp!);

    // let mids = [];
    // for (let media of localSdpObj.media) {
    //   mids.push(media.mid);
    //   if (media.mid == sender.mid) {
    //     sender.media = Media.merge(media, codecCap, this.remoteICEParameters, this.remoteICECandidates);
    //   }
    // }

    // this.usedMids = mids;
    // //remote media

    // if (false === this.isGotDtls) {
    //   this.isGotDtls = true;

    //   this.localDTLSParameters = getDtls(localSdpObj);

    //   this.ondtls(this.localDTLSParameters);
    // }
  }

  private async _sendInternal(track: MediaStreamTrack, codecCap: Codec) {
    const transceiver = await this.pc.addTransceiver(track, {
      direction: 'sendonly',
    });
    const sender = new Sender(track, transceiver, {
      test: 'test'
    });
    this.senders.push(sender);

    // try{
    //   const localSdp = await this.pc.createOffer();
    //   await this.pc.setLocalDescription(localSdp);//mid after setLocalSdp
  
    //   this.getLocalSdpData(sender, localSdp, codecCap);
  
    //   let remoteSdp = this.generateSdp();
  
    //   await this.pc.setRemoteDescription(remoteSdp);
  
    //   if (this.onsender) {
    //     this.onsender(sender);
    //   }

    // }catch(e){
    //   console.log(e);
    // }

  }
}