import sdpTransform from 'sdp-transform';

import AsyncQueue from './asyncQueue';
import Transport from './transport';

import Subscriber from './subscriber';

import { getDtls } from './utils';
import Media from './media';
import Sdp from './sdp';
import { RemoteICECandidate, StrDic, DTLSparameter } from './remoteParameters';
import { Codec } from './codec';
import RemotePublisher from './remotePublisher';

export default class Receiver extends Transport {
  pc: RTCPeerConnection;

  subscribers: Subscriber[] = [];
  
  asyncQueue = new AsyncQueue();
  isGotDtls = false;
  currentMid = 0;
  //event
  ontrack?: ((track: MediaStreamTrack, subscriber: Subscriber) => void)
  onsubscriber?: ((subscriber: Subscriber) => void)
  ondtls?: ((dtls: DTLSparameter) => void)
  onunsubscribed?: ((subscriber: Subscriber) => void)

  remotePublishers = new Map<string, RemotePublisher>();
  constructor(id: string, remoteICECandidates: RemoteICECandidate[], remoteICEParameters: StrDic, remoteDTLSParameters: StrDic) {
    super(id, remoteICECandidates, remoteICEParameters, remoteDTLSParameters);

    //FIXME: sdpSemantics: "unified-plan"
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', 
    bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require', sdpSemantics: "unified-plan" });

  }

  unsubscribeByUserId(userId: string) {
    for (let subscriber of this.subscribers) {
      if (userId === subscriber.userId) {
        this.unsubscribeBySubscriberId(subscriber.id);
      }
    }
  }

  addSub(publisherId: string, userId: string, subscriberId: string,
    codec: Codec, metadata: StrDic) {
    const mid = String(this.currentMid++);

    const media = Media.create(mid, codec, this.remoteICEParameters, this.remoteICECandidates, subscriberId);

    const subscriber = new Subscriber(mid, publisherId, userId, subscriberId, codec, metadata, media);

    this.subscribers.push(subscriber);
    return subscriber;
  }

  //TODO(CC): use receiver
  subscribe(subscriber: Subscriber) {
    this.asyncQueue.push({ execObj: this, taskFunc: this._subscribeInternal, parameters: [subscriber] });
  }

  getSubscriber(id: string) {
    return this.subscribers.find(s => s.id === id);
  }

  getSubscriberByPublisherId(publisherId: string) {
    return this.subscribers.find(s => s.publisherId === publisherId);
  }

  async _subscribeInternal(subscriber: Subscriber) {

    subscriber.media.direction = "sendonly";
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);

    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    //track
    const transceiver = await this.pc.getTransceivers().find(t => t.mid === subscriber.mid);
    subscriber.transceiver = transceiver;


    if (this.ontrack) this.ontrack(transceiver!.receiver.track, subscriber);

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

  unsubscribeByPublisherId(publisherId: string) {
    this.remotePublishers.delete(publisherId);

    const subscriber = this.subscribers.find(s => s.publisherId === publisherId);
    if (subscriber && subscriber.available) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unsubscribeInternal, parameters: [subscriber] });
    }
  }

  unsubscribeBySubscriberId(subscriberId: string) {
    const subscriber = this.subscribers.find(r => r.id === subscriberId);
    if (subscriber && subscriber.available) {
      this.asyncQueue.push({ execObj: this, taskFunc: this._unsubscribeInternal, parameters: [subscriber] });
    }
  }

  async _unsubscribeInternal(subscriber: Subscriber) {

    subscriber.media.direction = 'inactive';
    let remoteSdp = this.generateSdp();

    await this.pc.setRemoteDescription(remoteSdp);
    let answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    if (this.onunsubscribed) this.onunsubscribed(subscriber);
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

    for (let subscriber of this.subscribers) {
      sdpObj.medias.push(subscriber.media)
    }

    let sdp = sdpObj.toString();
    return new RTCSessionDescription({ type: 'offer', sdp: sdp });
  }

}

