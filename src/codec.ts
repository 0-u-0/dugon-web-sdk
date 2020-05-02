import { Str2StrDictionary } from './remoteParameters';

export class RtcpFeedback {
  type: string = '?';
  parameter: string = '?';
}

export class Extension {
  id: number = 0;
  uri: string = '?';
  recv = false;
  send = false;
}

export interface RTX {
  payload: number;
  ssrc: number;
}

export class Codec {
  constructor(public kind: string, public payload: number, public codecName: string,
    public codecFullName: string, public clockRate: number, public channels: number,
    public mid: string, public ssrc: number, public cname: string, public dtx = false,
    public reducedSize = true, public senderPaused = false, public rtx: RTX | null,
    public extensions: Array<Extension>, public parameters: [Str2StrDictionary], public rtcpFeedback: Array<RtcpFeedback>) {
  }
}