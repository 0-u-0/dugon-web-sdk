import Socket from './socket';
import Sender from './sender';
import { stringChecker } from './utils';
import { Metadata, metadataChecker } from './metadata'
import { RemoteICECandidate, TransportParameters, StrDic, StrKeyDic } from './remoteParameters';
import { Codec } from './codec';
import Receiver from './receiver';
import Subscriber from './subscriber';
import RemotePublisher from './remotePublisher';
import Stream from '../stream';

const DEFAULT_VIDEO_CODEC = 'VP8'
const DEFAULT_AUDIO_CODEC = 'opus'
const DEFAULT_AUDIO_MAX_BITRATE = 60000;
const DEFAULT_VIDEO_MAX_BITRATE = 150000;


declare type PublishOptions = {
  simulcast?: boolean,
  codec?: string,
  metadata?: Metadata,
  maxBitrate?: number,
}

declare type CodecDic = { [key: string]: Codec }

enum SessionState {
  New = "new",
  Connecting = "connecting",
  Connected = "connected",
  Disconnected = "disconnected",
}

// TODO(cc): 10/14/24 rename session to room
export default class Session {
  state: SessionState = SessionState.New;
  metadata: Metadata
  socket: Socket | null = null;
  supportedCodecs: CodecDic | null = null;
  sender?: Sender;
  receiver?: Receiver;

  //event
  onjoined: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onpub: ((userId: string, publisherId: string, trackId: string, metadata: StrDic) => void) | null = null;

  onin: ((userId: string, metadata: StrDic) => void) | null = null;
  onout: ((userId: string) => void) | null = null;

  onmedia?: ((source: MediaStreamTrack, subscriber: Subscriber) => void);
  onunsubscribed?: ((subscriber: Subscriber) => void);
  onchange?: ((subscriber: Subscriber, isPaused: boolean) => void)

  constructor(public readonly url: string, public sessionId: string, public userId: string, public tokenId: string, metadata: any) {

    stringChecker(this.url, 'url');
    stringChecker(this.userId, 'userId');
    stringChecker(this.sessionId, 'sessionId');
    stringChecker(this.tokenId, 'tokenId');
    metadataChecker(metadata);
    this.metadata = metadata;
  }

  public async connect({ pub = false, sub = false, mediaId = '' } = { pub: true, sub: true, mediaId: '' }) {
    if (SessionState.New === this.state) {
      this.state = SessionState.Connecting;

      this.socket = new Socket(this.url, {
        'roomId': this.sessionId,
        'tokenId': this.tokenId,
        'userId': this.userId,
        'metadata': this.metadata,
      });

      this.socket.onopen = async () => {
        await this.join(pub,sub,mediaId);
        if(this.onjoined) this.onjoined();
      };

      this.socket.onclose = () => {
        this.state = SessionState.Disconnected;

        if (this.onclose) {
          this.onclose();
        }
      };

      this.socket.onnotification = (event, data) => {
        this.handleNotification(event, data as StrKeyDic);

      }

      this.socket.init();


    } else {
      //TODO: warning
    }
  }

  async join(pub: boolean, sub: boolean, mediaId: string) {
    const parameters = await this.socket!.request({
      event: 'join',
      data: {
        pub,
        sub,
        mediaId,
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

    //after pub & sub init
    this.state = SessionState.Connected;
  }

  //TODO: simulcast config 
  //codec , opus, VP8,VP9, H264-BASELINE, H264-CONSTRAINED-BASELINE, H264-MAIN, H264-HIGH
  publish(source: Stream, { simulcast = false, metadata = {}, maxBitrate, codec }: PublishOptions = {
    simulcast: false, metadata: {},
  }) {
    //TODO: add track checker
    if (SessionState.Connected === this.state) {
      metadataChecker(metadata);

      if (!codec) {
        if (source.kind == 'audio') {
          codec = DEFAULT_AUDIO_CODEC;
          maxBitrate = DEFAULT_AUDIO_MAX_BITRATE;
        } else {
          codec = DEFAULT_VIDEO_CODEC;
          maxBitrate = DEFAULT_VIDEO_MAX_BITRATE;
        }
      }

      if (!maxBitrate) {
        if (source.kind == 'audio') {
          maxBitrate = DEFAULT_AUDIO_MAX_BITRATE;
        } else {
          maxBitrate = DEFAULT_VIDEO_MAX_BITRATE;
        }
      }


      let codecCap = this.supportedCodecs![codec];
      if (codecCap) {
        if (this.sender) this.sender.publish(source.track!, codecCap, metadata, maxBitrate);
      } else {
        //TODO: 
      }
    } else {
      //TODO:
    }
  }

  unpublish(publisherId: string) {
    stringChecker(publisherId, 'unpublish() publisherId');
    if (this.sender) this.sender.unpublish(publisherId);

  }

  async subscribe(publisherId: string) {
    // stringChecker(receiverId, 'subscribe() receiverId');
    // if (this.receiver) this.receiver.subscribe(receiverId);
    if (this.receiver) {
      const remotePublisher = this.receiver.remotePublishers.get(publisherId)
      if (remotePublisher) {
        const parameters = await this.request('subscribe', remotePublisher);
        const { codec, subscriberId } = parameters as { codec: Codec, publisherId: string, subscriberId: string }
        let subscriber = this.receiver.addSub(publisherId, remotePublisher.userId, subscriberId, codec, remotePublisher.metadata);
        this.receiver.subscribe(subscriber);
        //TODO(CC): remove onreceiver
        // if (this.onreceiver) this.onreceiver(receiver);
      }
    }

  }

  unsubscribe(publisherId: string) {
    stringChecker(publisherId, 'unsubscribe() publisherId');
    if (this.receiver) this.receiver.unsubscribeByPublisherId(publisherId);
  }

  //publisherId
  pause(id: string) {
    stringChecker(id, 'pause() id');
    let transportId = '';
    let role = '';
    let publisherId = '';

    if (this.receiver) {
      let receiver = this.receiver.getSubscriberByPublisherId(id);
      if (receiver) {
        transportId = this.receiver.id;
        role = 'sub';
        publisherId = receiver.publisherId;
      }
    }
    if (transportId == '' && this.sender) {
      let sender = this.sender.getPublisher(id);
      if (sender) {
        sender.changeTrackState(false);
        transportId = this.sender.id;
        role = 'pub';
        publisherId = sender.id;
      }
    }

    if (transportId != '') {
      this.request('pause', {
        transportId,
        publisherId,
        role
      })
    }
  }

  //publisherId
  resume(id: string) {
    stringChecker(id, 'resume() id');
    let transportId = '';
    let role = '';
    let publisherId = '';

    if (this.receiver) {
      let receiver = this.receiver.getSubscriberByPublisherId(id);
      if (receiver) {
        transportId = this.receiver.id;
        role = 'sub';
        publisherId = receiver.publisherId;
      }
    }
    if (transportId == '' && this.sender) {
      let publisher = this.sender.getPublisher(id);
      if (publisher) {
        publisher.changeTrackState(true);
        transportId = this.sender.id;
        role = 'pub';
        publisherId = publisher.id;
      }
    }

    if (transportId != '') {
      this.request('resume', {
        transportId,
        publisherId,
        role
      })
    }
  }

  private initTransport(role: string, transportParameters: TransportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.sender = new Sender(id, iceCandidates, iceParameters, dtlsParameters);
      this.sender.onunpublished = async publisher => {
        this.request('unpublish', {
          transportId: this.sender!.id,
          publisherId: publisher.id
        })
        //FIXME: maybe add onunpublished in session
      };

      this.sender.ondtls = async (dtlsParameters) => {
        this.request('dtls', {
          transportId: this.sender!.id,
          role: 'pub',
          dtlsParameters
        })
      };

      this.sender.onpublisher = async (publisher) => {
        const data = await this.socket!.request({
          event: 'publish',
          data: {
            transportId: this.sender!.id,
            codec: publisher.media!.toCodec(),
            metadata: publisher.metadata
          }
        })
        const { publisherId } = data as { publisherId: string };
        publisher.id = publisherId;
        if (this.onpub) {
          // this.onsender(sender);
          this.onpub(this.userId, publisher.id, publisher.track.id, publisher.metadata);
        }
      }

    } else if (role === 'sub') {
      this.receiver = new Receiver(id, iceCandidates, iceParameters, dtlsParameters);

      this.receiver.ondtls = async dtlsParameters => {
        await this.socket!.request({
          event: 'dtls',
          data: {
            transportId: this.receiver!.id,
            role: 'sub',
            dtlsParameters
          }
        });
      };

      this.receiver.ontrack = (track, subscriber) => {
        if (this.onmedia) this.onmedia(track, subscriber);
      };

      this.receiver.onunsubscribed = receiver => {
        if (this.onunsubscribed) this.onunsubscribed(receiver);
        this.socket!.request({
          event: 'unsubscribe',
          data: {
            transportId: this.receiver!.id,
            publisherId: receiver.publisherId,
          }
        })
      };

    }
  }

  private remotePublisherChanged(publisherId: string, isPaused: boolean) {
    if (this.receiver) {
      let receiver = this.receiver.getSubscriberByPublisherId(publisherId);
      if (receiver) {
        receiver.senderPaused = isPaused;
        if (this.onchange) this.onchange(receiver, isPaused);
      }
    }
  }

  private handleNotification(event: string, data: StrKeyDic) {
    switch (event) {
      case 'join': {
        let { userId, metadata } = data as { userId: string, metadata: StrDic };

        if (this.onin) {
          this.onin(userId, metadata);
        }


        break;
      };
      case 'leave': {
        let { userId } = data as { userId: string };

        //TODO: release all receiver
        if (this.receiver) {
          this.receiver.unsubscribeByUserId(userId);
        }
        if (this.onout) this.onout(userId);


        break;
      };
      case 'publish': {
        let remotePublisher = data as RemotePublisher;

        if (this.receiver) {
          this.receiver.remotePublishers.set(remotePublisher.publisherId, remotePublisher);
          if (this.onpub) {
            //reuse publishId as trackId
            this.onpub(remotePublisher.userId, remotePublisher.publisherId, remotePublisher.publisherId, remotePublisher.metadata);
          }
        }

        break;
      };
      case 'unpublish': {
        let { publisherId, userId } = data;
        if (this.receiver) {
          this.receiver.unsubscribeByPublisherId(publisherId);
        }

        break;
      }
      case 'pause': {
        let { publisherId } = data;
        this.remotePublisherChanged(publisherId, true);
        break;
      }
      case 'resume': {
        let { publisherId } = data;
        this.remotePublisherChanged(publisherId, false);
        break;
      }
      default: {
        console.log('unknown event ', event);
      }
    }
  }

  private async request(event: string, data: object) {
    if (this.socket) {
      return await this.socket.request({
        event, data
      })
    } else {
      //TODO: 
    }
    return null
  }

}

