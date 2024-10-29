import Media from './media';
import { Codec } from './codec';
import { StrDic } from './remoteParameters';

export default class Subscriber {
  transceiver?: RTCRtpTransceiver;
  pubPaused:boolean;
  constructor(public mid: string, public publisherId: string, public userId: string,
    public id: string, public codec: Codec, public metadata: StrDic, public media: Media) {
      this.pubPaused = this.codec.pubPaused;
  }

  get available(){
    return this.media.available;
  }

  get kind() {
    return this.codec.kind;
  }


}
