import Socket from './socket';
import Sender from './sender';
import { stringChecker } from './utils';
import { Metadata, metadataChecker } from './metadata'
import { RemoteICECandidate, TransportParameters, StrDic, StrKeyDic } from './remoteParameters';
import { Codec } from './codec';
import Receiver from './receiver';
import Subscriber from './subscriber';
import RemoteSender from './remotePublisher';
import DugonMediaSource from './mediasource';
import User from './user';

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

  users: Map<string, User>;
  //event
  onclose: (() => void) | null = null;
  onsender: ((senderId: string, userId: string, metadata: StrDic) => void) | null = null;
  onuser: ((userId: string, state: string, metadata: StrDic) => void) | null = null;
  onout?: ((userId: string) => void);
  onmedia?: ((source: DugonMediaSource, subscriber: Subscriber) => void);
  onunsubscribed?: ((subscriber: Subscriber) => void);
  // onreceiver?: ((receiver: Receiver) => void)
  onchange?: ((subscriber: Subscriber, isPaused: boolean) => void)
  constructor(public readonly url: string, public sessionId: string, public userId: string, public tokenId: string, metadata: any) {

    stringChecker(this.url, 'url');
    stringChecker(this.userId, 'userId');
    stringChecker(this.sessionId, 'sessionId');
    stringChecker(this.tokenId, 'tokenId');
    metadataChecker(metadata);
    this.metadata = metadata;
    this.users = new Map();

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

      this.socket.onclose = () => {
        this.state = SessionState.Disconnected;

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

    } else {
      //TODO: warning
    }
  }

  //TODO: simulcast config 
  //codec , opus, VP8,VP9, H264-BASELINE, H264-CONSTRAINED-BASELINE, H264-MAIN, H264-HIGH
  publish(source: DugonMediaSource, { simulcast = false, metadata = {}, maxBitrate, codec }: PublishOptions = {
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
        if (this.sender) this.sender.publish(source.track, codecCap, metadata, maxBitrate);
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
      const remoteSender = this.receiver.remotePublishers.get(publisherId)
      if (remoteSender) {
        const parameters = await this.request('subscribe', remoteSender);
        const { codec, receiverId } = parameters as { codec: Codec, senderId: string, receiverId: string }
        let receiver = this.receiver.addReceiver(publisherId, remoteSender.userId, receiverId, codec, remoteSender.metadata);
        this.receiver.subscribe(receiver);
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
        senderId:publisherId,
        role
      })
    }
  }

  //publisherId
  resume(id: string) {
    stringChecker(id, 'resume() id');
    let transportId = '';
    let role = '';
    let senderId = '';

    if (this.receiver) {
      let receiver = this.receiver.getSubscriberByPublisherId(id);
      if (receiver) {
        transportId = this.receiver.id;
        role = 'sub';
        senderId = receiver.publisherId;
      }
    }
    if (transportId == '' && this.sender) {
      let publisher = this.sender.getPublisher(id);
      if (publisher) {
        publisher.changeTrackState(true);
        transportId = this.sender.id;
        role = 'pub';
        senderId = publisher.id;
      }
    }

    if (transportId != '') {
      this.request('resume', {
        transportId,
        senderId,
        role
      })
    }
  }

  private initTransport(role: string, transportParameters: TransportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.sender = new Sender(id, iceCandidates, iceParameters, dtlsParameters);
      this.sender.onunpublished = async sender => {
        this.request('unpublish', {
          transportId: this.sender!.id,
          senderId: sender.id
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
        const { senderId } = data as { senderId: string };
        publisher.id = senderId;
        if (this.onsender) {
          // this.onsender(sender);
          this.onsender(publisher.id, this.userId, publisher.metadata);
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
        // this.resume(receiver.id);
        if (this.onmedia) this.onmedia(new DugonMediaSource(track), subscriber);
      };

      this.receiver.onunsubscribed = receiver => {
        if (this.onunsubscribed) this.onunsubscribed(receiver);
        this.socket!.request({
          event: 'unsubscribe',
          data: {
            transportId: this.receiver!.id,
            senderId: receiver.publisherId,
          }
        })
      };

    }
  }

  private remoteSenderChanged(senderId: string, isPaused: boolean) {
    if (this.receiver) {
      let receiver = this.receiver.getSubscriberByPublisherId(senderId);
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
        if (!this.users.has(userId)) {
          const user = new User(userId, metadata);
          this.users.set(userId, user);

          if (this.onuser) {
            this.onuser(userId, 'in', metadata);
          }
        } else {
          // TODO(cc): 10/17/24 error
        }

        break;
      };
      case 'leave': {
        let { userId } = data as { userId: string };

        const user = this.users.get(userId);

        if(user !== undefined){
          const metadata = user.metadata;
          this.users.delete(userId);
          //TODO: release all receiver
          if (this.receiver) {
            this.receiver.unsubscribeByUserId(userId);
          }
          if (this.onuser) this.onuser(userId, 'out',metadata);
        }else{
          // TODO(cc): 10/17/24 error
        }
        
        break;
      };
      case 'publish': {
        let remoteSender = data as RemoteSender;

        if (this.receiver) {
          this.receiver.remotePublishers.set(remoteSender.publisherId, remoteSender);
          if (this.onsender) {
            this.onsender(remoteSender.publisherId, remoteSender.userId, remoteSender.metadata);
          }
        }

        break;
      };
      case 'unpublish': {
        let { senderId, userId } = data;
        if (this.receiver) {
          this.receiver.unsubscribeByPublisherId(senderId);
        }

        break;
      }
      case 'pause': {
        let { senderId } = data;
        this.remoteSenderChanged(senderId, true);
        break;
      }
      case 'resume': {
        let { senderId } = data;
        this.remoteSenderChanged(senderId, false);
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

