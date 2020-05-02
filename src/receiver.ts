import Media from './media';
import { Codec } from './codec';
import { StrDic } from './remoteParameters';

export default class Receiver {
  transceiver?: RTCRtpTransceiver;
  senderPaused:boolean = this.codec.senderPaused;
  constructor(public mid: string, public senderId: string, public tokenId: string,
    public id: string, public codec: Codec, public metadata: StrDic, public media: Media) {
  }

  get kind() {
    return this.codec.kind;
  }


}
