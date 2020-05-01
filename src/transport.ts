import { Str2StrDictionary,RemoteICECandidate } from './remoteParameters';

export default class Transport {
  pc: RTCPeerConnection;
  constructor(public id: string, public remoteICECandidates: Array<RemoteICECandidate>,
    public remoteICEParameters: Str2StrDictionary, public remoteDTLSParameters: Str2StrDictionary) {
    //FIXME: sdpSemantics: "unified-plan"
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });

  }
} 
