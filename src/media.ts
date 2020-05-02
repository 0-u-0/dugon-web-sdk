import { Codec, RTX, Extension, RtcpFeedback } from './codec';
import { RemoteICECandidate, Str2StrDictionary } from './remoteParameters';
import { MediaDescription } from 'sdp-transform';

const H264_BASELINE = '42001f';
const H264_CONSTRAINED_BASELINE = '42e01f'
const H264_MAIN = '4d0032'
const H264_HIGH = '640032'

function objToStr(obj:[Str2StrDictionary]) {
  let arr = [];
  for (let k in obj) {
    arr.push(`${k}=${obj[k]}`)
  }
  return arr.join(';')
}


//TODO: dtx
export default class Media {
  // send,recv
  role: string | null = null
  port = 7
  setup: string = 'actpass'
  //TODO:  connection
  connection: string = ''
  //TODO: iceUfrag icePwd iceOptions
  iceUfrag: string = ''
  icePwd: string = ''
  iceOptions: string = ''

  reducedSize = true;
  candidates = Array<RemoteICECandidate>();
  //TODO: msidAppdata
  msidAppdata: string = ''
  constructor(public type: string, public direction: string, public codecName: string, public payload: number,
    public rate: number, public mid: string, public cname: string,
    public channels = 1, public parameters: [Str2StrDictionary], public ssrc: number,
    public rtcpFb: Array<RtcpFeedback>, public extension: Array<Extension>, public rtx: RTX| null, public protocol: string) {

  }

  get available() {
    return this.direction != "inactive"
  }

  toCodec() {
    return new Codec(this.type, this.payload, this.codecName, this.codecName, this.rate, this.channels,
      this.mid, this.ssrc, this.cname, false, true, false, this.rtx, this.extension, this.parameters, this.rtcpFb);
  }


  //for send
  static merge(media: any, codecCap: Codec, iceParameters: Str2StrDictionary, iceCandidates:  Array<RemoteICECandidate>) {

    //codecCap, ext should be merged
    let codec, channels,
      fmtp;
    let cname = '';
    let payload = 0, rate = 0;
    let rtx: RTX | null = null;

    let rtcpFb = Array<RtcpFeedback>();
    let extension = Array<Extension>();
    let ssrc, direction;

    let parametersShit = [];

    if (media.direction === 'inactive') {
      direction = 'inactive';
    } else {
      direction = 'recvonly'
    }

    for (let k in codecCap.parameters) {
      parametersShit.push(`${k}=${codecCap.parameters[k]}`)
    }
    //TODO: h264
    // H264_BASELINE,H264_CONSTRAINED_BASELINE,H264_MAIN,H264_HIGH
    if (codecCap.codecName.slice(0, 4) == 'H264') {
      codec = 'H264';

      for (let f of media.fmtp) {
        let matched = true;
        for (let p of parametersShit) {
          if (!f.config.includes(p)) {
            matched = false;
          }
        }
        if (matched) {
          payload = f.payload;
          fmtp = f.config;
        }

        if (f.config == `apt=${payload}`) {
          rtx = { payload: f.payload } as RTX;
        }
      }

      for (let rtp of media.rtp) {
        if (rtp.payload == payload) {
          if (rtp.rate) {
            rate = rtp.rate;
          }
          channels = rtp.encoding;
        }
      }

    } else {
      codec = codecCap.codecName;

      for (let rtp of media.rtp) {
        if (rtp.codec == codec) {
          payload = rtp.payload;
          if (rtp.rate) {
            rate = rtp.rate;
          }
          channels = rtp.encoding;
        }
      }

      for (let f of media.fmtp) {
        if (f.payload == payload) {
          fmtp = f.config;
        }
        if (f.config == `apt=${payload}`) {
          rtx = { payload: f.payload } as RTX;
        }
      }
    }


    //codecCap, rtcpFb should be merged
    /**
     //TODO:  use transport-cc as default , extension
     */
    if (media.rtcpFb) {
      for (let tf of media.rtcpFb) {
        if (tf.payload == payload && tf.type != 'goog-remb') {
          let parameter = tf.subtype ? tf.subtype : ""
          for (let tfCap of codecCap.rtcpFeedback) {
            if (tfCap.type == tf.type && tfCap.parameter == parameter) {
              rtcpFb.push({
                type: tf.type,
                parameter
              });
              break;
            }
          }
        }
      }
    }


    //codecCap, ext should be merged
    let avaiableExt = codecCap.extensions.filter(ext => ext['recv']);

    if (media.ext) {
      for (let e of media.ext) {
        for (let ae of avaiableExt) {
          if (e.uri == ae.uri) {
            let newExt = {
              'id': e.value,
              'uri': e.uri
            } as Extension;
            extension.push(newExt);
            break;
          }
        }
      }
    }

    if (media.ssrcs) {
      for (let s of media.ssrcs) {
        if (s.attribute == 'cname') {
          if (s.value) {
            cname = s.value;
          }
          break;
        }
      }

      ssrc = media.ssrcs[0].id;
      if (media.ssrcGroups) {
        for (let sg of media.ssrcGroups) {
          if (sg.semantics == 'FID') {
            if (rtx) {
              rtx.ssrc = parseInt(sg.ssrcs.split(' ')[1]);
            }
            break;
          }
        }
      }

    }
    //ssrc

    let parameters = {} as [Str2StrDictionary];
    if (fmtp) {
      let p1 = fmtp.split(';')
      for (let l of p1) {
        let r = l.split('=');
        let key = r[0];
        let value = r[1];
        parameters[key] = value
      }
    }



    let newMedia = new Media(media.type, direction, codec, payload, rate, media.mid!, cname, channels,
      parameters, ssrc, rtcpFb, extension, rtx, media.protocol);
    newMedia.iceUfrag = iceParameters.usernameFragment;
    newMedia.icePwd = iceParameters.password;
    newMedia.candidates = iceCandidates;
    newMedia.role = 'recv';
    newMedia.setup = 'passive';
    return newMedia;
  }

  toSdp() {
    let lines = [];
    //var
    let port = 0;
    if (this.available || this.mid == '0') {
      port = 7;
    }

    let mLine = `m=${this.type} ${port} ${this.protocol} ${this.payload}`;
    if (this.rtx) {
      mLine = mLine + ' ' + this.rtx.payload;
    }

    lines.push(mLine);
    lines.push(`c=IN IP4 127.0.0.1`);
    if (this.channels == 1) {
      lines.push(`a=rtpmap:${this.payload} ${this.codecName}/${this.rate}`);
    } else {
      lines.push(`a=rtpmap:${this.payload} ${this.codecName}/${this.rate}/${this.channels}`);
    }

    if (this.rtx) {
      lines.push(`a=rtpmap:${this.rtx.payload} rtx/${this.rate}`);
    }

    if (Object.keys(this.parameters).length > 0) {
      lines.push(`a=fmtp:${this.payload} ${objToStr(this.parameters)}`);
    }

    if (this.rtx) {
      lines.push(`a=fmtp:${this.rtx.payload} apt=${this.payload}`);
    }

    //rtcp-feedback
    for (let rf of this.rtcpFb) {
      let str = `${rf.type} ${rf.parameter}`.trim();
      lines.push(`a=rtcp-fb:${this.payload} ${str}`);
    }

    //extension
    if (this.available) {
      for (let e of this.extension) {
        lines.push(`a=extmap:${e.id} ${e.uri}`);
      }
    }

    lines.push(`a=setup:${this.setup}`);

    lines.push(`a=mid:${this.mid}`);

    //send 
    if (this.role === 'send') {
      lines.push(`a=msid:${this.cname} ${this.msidAppdata}`);
    }

    lines.push(`a=${this.direction}`);

    //ice 
    lines.push(`a=ice-ufrag:${this.iceUfrag}`);
    lines.push(`a=ice-pwd:${this.icePwd}`);

    //TODO: use other direction
    if (this.candidates.length > 0) {
      for (let c of this.candidates) {
        lines.push(`a=candidate:${c.foundation} ${c.component} ${c.transport} ${c.priority} ${c.ip} ${c.port} typ ${c.type}`);
      }
      lines.push(`a=end-of-candidates`);
    }



    if (this.role === 'send') {
      if (this.rtx) {
        lines.push(`a=ssrc-group:FID ${this.ssrc} ${this.rtx.ssrc}`);
      }

      lines.push(`a=ssrc:${this.ssrc} cname:${this.cname}`);
      if (this.rtx) {
        lines.push(`a=ssrc:${this.rtx.ssrc} cname:${this.cname}`);
      }
    }

    //TODO: renomination
    lines.push(`a=ice-options:renomination`);
    lines.push(`a=rtcp-mux`);
    lines.push(`a=rtcp-rsize`);

    return lines.join('\r\n');
  }


  // static create(mid, codec, iceParameters, iceCandidates, receiverId) {
  //   let media = new Media();
  //   media.role = 'send';
  //   media.type = codec.kind;
  //   media.mid = mid;
  //   media.port = 0;
  //   media.protocol = 'UDP/TLS/RTP/SAVPF';
  //   media.connection = 'IN IP4 127.0.0.1';
  //   //enable after subscribe
  //   media.setup = 'actpass';
  //   media.direction = 'inactive';
  //   media.iceUfrag = iceParameters.usernameFragment;
  //   media.icePwd = iceParameters.password;
  //   //TODO: iceOptions
  //   media.iceOptions = '';
  //   media.codecName = codec.codecName;
  //   media.rate = codec.clockRate;
  //   media.channels = codec.channels;
  //   media.parameters = codec.parameters;
  //   media.payload = codec.payload;
  //   media.ssrc = codec.ssrc;
  //   media.rtx = codec.rtx;
  //   media.rtcpFb = codec.rtcpFeedback;
  //   media.extension = codec.extensions;
  //   media.cname = codec.cname;
  //   media.reducedSize = codec.reducedSize;
  //   media.candidates = iceCandidates;
  //   //https://tools.ietf.org/html/draft-ietf-mmusic-msid-17#page-5
  //   // this will become trackId 
  //   media.msidAppdata = receiverId;

  //   return media;
  // }

}
