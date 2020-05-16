import { StrDic,RemoteICECandidate } from './remoteParameters';

declare global {
  interface RTCConfiguration {
    optional?: any[]
    sdpSemantics?: string
  }
}


export default class Transport {
  constructor(public id: string, public remoteICECandidates: Array<RemoteICECandidate>,
    public remoteICEParameters: StrDic, public remoteDTLSParameters: StrDic) {

  }
} 
