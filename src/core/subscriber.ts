import Media from './media';
import { Codec } from './codec';
import { StrDic } from './remoteParameters';

export default class Subscriber {
  transceiver?: RTCRtpTransceiver;
  senderPaused:boolean;
  constructor(public mid: string, public publisherId: string, public userId: string,
    public id: string, public codec: Codec, public metadata: StrDic, public media: Media) {
      this.senderPaused = this.codec.senderPaused;
  }

  get available(){
    return this.media.available;
  }

  get kind() {
    return this.codec.kind;
  }


}
