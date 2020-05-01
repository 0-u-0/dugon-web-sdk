import Socket from './socket';
import Publisher from './publisher';
import { stringChecker } from './utils';
import { Metadata, metadataChecker } from './metadata'
import { RemoteICECandidate, TransportParameters } from './remoteParameters';
import { Codec} from './codec';




class SessionEvent {
  onin() {

  };
  onclose() {

  }
}

export default class Session extends SessionEvent {
  metadata: Metadata
  socket: Socket | null = null;
  supportedCodecs: Map<string, Codec> | null = null;
  publisher: Publisher | null = null;
  constructor(public readonly url: string, public sessionId: string, public tokenId: string,
    { metadata = {} } = {}) {
    super();
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
      this.onclose();
    };

    this.socket.onnotification = (event, data) => {
      console.log(event, data)
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
      codecs: Map<string, Codec>, pub: TransportParameters, sub: TransportParameters
    };
    if (pub) {
      this.initTransport('pub', pubParameters);
    }
    if (sub) {
      this.initTransport('sub', subParameters);
    }
    this.supportedCodecs = codecs;
  }

  initTransport(role: string, transportParameters: TransportParameters) {
    const { id, iceCandidates, iceParameters, dtlsParameters } = transportParameters;

    if (role === 'pub') {
      this.publisher = new Publisher(id, iceCandidates, iceParameters, dtlsParameters);
      // this.publisher.onsenderclosed = async senderId => {
      //   await this.socket.request({
      //     event: 'unpublish',
      //     data: {
      //       transportId: this.publisher.id,
      //       senderId
      //     }
      //   })
      // };

      // this.publisher.ondtls = async dtlsParameters => {
      //   await this.socket.request({
      //     event: 'dtls',
      //     data: {
      //       transportId: this.publisher.id,
      //       role: 'pub',
      //       dtlsParameters
      //     }
      //   });
      // };

      // this.publisher.onsender = async (sender) => {
      //   const data = await this.socket.request({
      //     event: 'publish',
      //     data: {
      //       transportId: this.publisher.id,
      //       codec: sender.media.toCodec(),
      //       metadata: sender.metadata
      //     }
      //   })
      //   const { senderId } = data;
      //   sender.senderId = senderId;
      //   this.onsender(sender);

      // }

      // //init pub
      // this.publisher.init();

    }
  }
}

