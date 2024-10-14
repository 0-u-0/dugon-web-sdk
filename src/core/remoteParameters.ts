export interface StrDic {
  [index: string]: string;
}

export type DTLSparameter = {
  fingerprint: StrDic;
  setup: string;
}

export interface StrKeyDic{
  [index: string]: any;
}

export interface RemoteICECandidate {
  foundation: string;
  ip: string;
  component: number;
  port: number;
  transport: string;
  type: string;
  priority: string;
}

export interface TransportParameters {
  id: string;
  iceCandidates: [RemoteICECandidate];
  iceParameters: StrDic;
  dtlsParameters: StrDic,
}
