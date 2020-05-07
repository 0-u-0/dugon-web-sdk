import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Receiver from './receiver';

import { getDtls } from './utils';
import Media from './media';
import Sdp from './sdp';
import { RemoteICECandidate, StrDic, DTLSparameter } from './remoteParameters';
import { Codec } from './codec';
import RemoteSender from './remoteSender';

export default class Subscriber extends Transport {
  receivers: Receiver[] = [];
  asyncQueue = new AsyncQueue();
  isGotDtls = false;
  currentMid = 0;
  //event
  ontrack?: ((track: MediaStreamTrack, receiver: Receiver) => void)
  onreceiver?: ((receiver: Receiver) => void)
  ondtls?: ((dtls: DTLSparameter) => void)
  onunsubscribed?: ((receiver: Receiver) => void)

  remoteSenders = new Map<string,RemoteSender>();
  constructor(id: string, remoteICECandidates: RemoteICECandidate[], remoteICEParameters: StrDic, remoteDTLSParameters: StrDic) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);
  }

  unsubscribeByTokenId(tokenId: string) {
    for (let receiver of this.receivers) {
      if (tokenId === receiver.tokenId) {
        this.unsubscribeByReceiverId(receiver.id);
      }
    }
  }

  addReceiver(senderId: string, tokenId: string, receiverId: string,
    codec: Codec, metadata: StrDic) {
    const mid = String(this.currentMid++);

    const media = Media.create(mid, codec, this.remoteICEParameters, this.remoteICECandidates, receiverId);

    const receiver = new Receiver(mid, senderId, tokenId, receiverId, codec, metadata, media);

    this.receivers.push(receiver);
    return receiver;
  }

  subscribe(receiverId: string) {
    const receiver = this.receivers.find(r => r.id === receiverId);
    if (receiver) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._subscribeInternal, parameters: [receiver] });
    }
  }

  getReceiver(id: string) {
    return this.receivers.find(r => r.id === id);
  }

  getReceiverBySenderId(senderId: string) {
    return this.receivers.find(r => r.senderId === senderId);
  }

  async _subscribeInternal(receiver: Receiver) {

    receiver.media.direction = "sendonly";
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);

    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    //track
    const transceiver = await this.pc.getTransceivers().find(t => t.mid === receiver.mid);
    receiver.transceiver = transceiver;


    if (this.ontrack) this.ontrack(transceiver!.receiver.track, receiver);

    //TODO: receiver resume
    if (!this.isGotDtls) {
      this.isGotDtls = true;
      //dtls
      let answerSdpObj = sdpTransform.parse(answer.sdp!);
      let dtls = getDtls(answerSdpObj);
      if (this.ondtls) {
        this.ondtls(dtls!);
      }
    }

  }

  unsubscribeBySenderId(senderId: string) {
    const receiver = this.receivers.find(r => r.senderId === senderId);
    if (receiver && receiver.available) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unsubscribeInternal, parameters: [receiver] });
    }
  }

  unsubscribeByReceiverId(receiverId: string) {
    const receiver = this.receivers.find(r => r.id === receiverId);
    if (receiver && receiver.available) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unsubscribeInternal, parameters: [receiver] });
    }
  }

  async _unsubscribeInternal(receiver: Receiver) {

    receiver.media.direction = 'inactive';
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    if (this.onunsubscribed) this.onunsubscribed(receiver);
  }

  init() {
    this.pc = new RTCPeerConnection();
  }

  generateSdp() {

    let sdpObj = new Sdp();
    sdpObj.fingerprint = {
      algorithm: this.remoteDTLSParameters.algorithm,
      hash: this.remoteDTLSParameters.value
    }

    for (let receiver of this.receivers) {
      sdpObj.medias.push(receiver.media)
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'offer', sdp: sdp });
  }

}

