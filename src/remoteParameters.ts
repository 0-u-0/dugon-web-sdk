export interface Str2StrDictionary{
  [index: string]: string;
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
  iceParameters: Str2StrDictionary;
  dtlsParameters: Str2StrDictionary, 
}
