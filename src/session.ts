import Socket from './socket';
import Publisher from './publisher';
import { stringChecker } from './utils';
import { Metadata, metadataChecker } from './metadata'
import { RemoteICECandidate, TransportParameters, StrDic, StrKeyDic } from './remoteParameters';
import { Codec } from './codec';
import Sender from './sender';
import Subscriber from './subscriber';
import Receiver from './receiver';

const DEFAULT_VIDEO_CODEC = 'VP8'
const DEFAULT_AUDIO_CODEC = 'opus'



interface PublishOptions {
  simulcast: boolean,
  codec: string | null
}

declare type CodecDic = { [key: string]: Codec }

export default class Session {
  //TODO: add init state
  metadata: Metadata
  socket: Socket | null = null;
  supportedCodecs: CodecDic | null = null;
  publisher?: Publisher;
  subscriber?: Subscriber;
  //event
  onclose: (() => void) | null = null;
  onsender: ((sender: Sender) => void) | null = null;
  onin: ((tokenId: string, metadata: StrDic) => void) | null = null;
  onout?: ((tokenId: string) => void);
  ontrack?: ((track: MediaStreamTrack, receiver: Receiver) => void);
  onunsubscribed?: ((receiver: Receiver) => void);
  onreceiver?: ((receiver: Receiver, tokenId: string, senderId: string, metadata: StrDic) => void)
  constructor(public readonly url: string, public sessionId: string, public tokenId: string,
    { metadata = {} } = {}) {

    stringChecker(this.url, 'url')
    stringChecker(this.sessionId, 'sessionId')
    stringChecker(this.tokenId, 'tokenId')
    metadataChecker(metadata)
    this.metadata = metadata;

  }

  public async connect({ pub = false, sub = false } = { pub: true, sub: true }) {

    this.socket = new Socket(this.url, {
      'sessionId': this.sessionId,
      'tokenId': this.tokenId,
      'metadata': this.metadata,
    });

    this.socket.onclose = () => {
      if (this.onclose) {
        this.onclose();
      }
    };

    this.socket.onnotification = (event, data) => {
      this.handleNotification(event, data as StrKeyDic);

    }

    await this.socket.init();

    const parameters = await this.socket.request({
      event: 'join',
      data: {
        pub,
        sub,
      }
    });

    const { codecs, pub: pubParameters, sub: subParameters } = parameters as {
      codecs: CodecDic, pub: TransportParameters, sub: TransportParameters
    };
    if (pub) {
      this.initTransport('pub', pubParameters);
    }
    if (sub) {
      this.initTransport('sub', subParameters);
    }
    this.supportedCodecs = codecs;
  }

  //TODO: simulcast config , metadata
  //codec , opus, VP8,VP9, H264-BASELINE, H264-CONSTRAINED-BASELINE, H264-MAIN, H264-HIGH
  publish(track: MediaStreamTrack, { simulcast = false, codec }: PublishOptions = {
    simulcast: false, codec: null
  }) {
    if (!codec) {
      if (track.kind == 'audio') {
        codec = DEFAULT_AUDIO_CODEC;
      } else {
        codec = DEFAULT_VIDEO_CODEC;
      }
    }

    let codecCap = this.supportedCodecs![codec];
    if (codecCap) {
      this.publisher!.publish(track, codecCap);
    } else {
      //TODO: 
    }
  }

  unpublish(senderId: string) {
    if (this.publisher) {
      this.publisher.unpublish(senderId);
    }
  }

  subscribe(receiverId: string) {
    if (this.subscriber) this.subscriber.subscribe(receiverId);
  }

  unsubscribe(receiverId:string){
    if(this.subscriber) this.subscriber.unsubscribeByReceiverId(receiverId);
  }



  private initTransport(role: string, transportParameters: TransportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.publisher = new Publisher(id, iceCandidates, iceParameters, dtlsParameters);
      this.publisher.onunpublished = async senderId => {
        await this.socket!.request({
          event: 'unpublish',
          data: {
            transportId: this.publisher!.id,
            senderId
          }
        })
      };

      this.publisher.ondtls = async (dtlsParameters) => {
        await this.socket!.request({
          event: 'dtls',
          data: {
            transportId: this.publisher!.id,
            role: 'pub',
            dtlsParameters
          }
        });
      };

      this.publisher.onsender = async (sender) => {
        const data = await this.socket!.request({
          event: 'publish',
          data: {
            transportId: this.publisher!.id,
            codec: sender.media!.toCodec(),
            metadata: sender.metadata
          }
        })
        const { senderId } = data as { senderId: string };
        sender.id = senderId;
        if (this.onsender) {
          this.onsender(sender);
        }
      }

    } else if (role === 'sub') {
      this.subscriber = new Subscriber(id, iceCandidates, iceParameters, dtlsParameters);

      this.subscriber.ondtls = async dtlsParameters => {
        await this.socket!.request({
          event: 'dtls',
          data: {
            transportId: this.subscriber!.id,
            role: 'sub',
            dtlsParameters
          }
        });
      };

      this.subscriber.ontrack = (track, receiver) => {
        if (this.ontrack) this.ontrack(track, receiver);
      };

      this.subscriber.onunsubscribed = receiver => {
        if (this.onunsubscribed) this.onunsubscribed(receiver);
        this.socket!.request({
          event: 'unsubscribe',
          data: {
            transportId: this.subscriber!.id,
            senderId: receiver.senderId,
          }
        })
      };

    }
  }

  private handleNotification(event: string, data: StrKeyDic) {
    console.log('notification: ', event, data);
    switch (event) {
      case 'join': {
        let { tokenId, metadata } = data as { tokenId: string, metadata: StrDic };
        if (this.onin) {
          this.onin(tokenId, metadata);
        }
        break;
      };
      case 'leave': {
        let { tokenId } = data as { tokenId: string };
        //TODO: release all receiver
        if (this.subscriber) {
          this.subscriber.unsubscribeByTokenId(tokenId);
        }
        if (this.onout) this.onout(tokenId);
        break;
      };
      case 'publish': {
        let { senderId, tokenId, metadata, codec, receiverId } = data;
        if (this.subscriber) {
          let receiver = this.subscriber.addReceiver(senderId, tokenId, receiverId, codec, metadata);
          if (this.onreceiver) this.onreceiver(receiver, tokenId, senderId, metadata);
        }

        break;
      };
      case 'unpublish': {
        let { senderId, tokenId } = data;
        if (this.subscriber) {
          this.subscriber.unsubscribeBySenderId(senderId);
        }

        break;
      }
      case 'pause': {
        //FIXME: pause
        // let { senderId } = data;
        // if (this.subscriber) {
        //   this.subscriber.removeReceiver(senderId);
        // }

        break;
      }
      case 'resume': {
        //FIXME: pause
        // let { senderId } = data;
        // if (this.subscriber) {
        //   this.subscriber.removeReceiver(senderId);
        // }

        break;
      }
      default: {
        console.log('unknown event ', event);
      }
    }
  }

}

