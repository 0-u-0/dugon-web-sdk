import Socket from './socket';
import Publisher from './publisher';
import { stringChecker } from './utils';
import { Metadata, metadataChecker } from './metadata'
import { RemoteICECandidate, TransportParameters } from './remoteParameters';
import { Codec } from './codec';
import Sender from './sender';

const DEFAULT_VIDEO_CODEC = 'VP8'
const DEFAULT_AUDIO_CODEC = 'opus'

class SessionEvent {
  onin() {

  };
  onclose() {

  }
  onsender(sender: Sender) {

  }
}

interface PublishOptions {
  simulcast: boolean,
  codec: string | null
}

declare type CodecDic = { [key: string]: Codec }

export default class Session extends SessionEvent {
  metadata: Metadata
  socket: Socket | null = null;
  supportedCodecs: CodecDic | null = null;
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
  async publish(track: MediaStreamTrack, { simulcast = false, codec }: PublishOptions = {
    simulcast: false, codec: null
  }) {
    if (!codec) {
      if (track.kind == 'audio') {
        codec = DEFAULT_AUDIO_CODEC;
      } else {
        codec = DEFAULT_VIDEO_CODEC;
      }
    }

    let codecCap = this.supportedCodecs[codec];
    if (codecCap) {
      this.publisher.publish(track, codecCap);
    } else {
      //TODO: 
    }
  }


  private initTransport(role: string, transportParameters: TransportParameters) {
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

      this.publisher.ondtls = async (dtlsParameters) => {
        await this.socket.request({
          event: 'dtls',
          data: {
            transportId: this.publisher.id,
            role: 'pub',
            dtlsParameters
          }
        });
      };

      this.publisher.onsender = async (sender) => {
        const data = await this.socket.request({
          event: 'publish',
          data: {
            transportId: this.publisher.id,
            codec: sender.media.toCodec(),
            metadata: sender.metadata
          }
        })
        const { senderId } = data as { senderId: string };
        sender.id = senderId;
        this.onsender(sender);
      }

      // //init pub
      // this.publisher.init();

    }
  }
}

