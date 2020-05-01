export default class Transport {
  pc: RTCPeerConnection;
  constructor(public id: string, public remoteICECandidates: Array<object>,
    public remoteICEParameters: object, public remoteDTLSParameters: object) {
    //FIXME: sdpSemantics: "unified-plan"
    this.pc = new RTCPeerConnection({ iceServers: [], iceTransportPolicy: 'all', bundlePolicy: 'max-bundle', rtcpMuxPolicy: 'require' });

  }



} 
