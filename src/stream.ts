import DugonMediaSource from "./core/mediasource";
import Publisher from "./core/publisher";


export type PlaySource =  HTMLMediaElement| string ;

export interface CreateLocalStreamConfig {
  video?: boolean
  audio?: boolean
  share?: boolean
}

enum StreamType {
  Local = "local",
  Remote = "audio",
}

// LocalStream,

export default class Stream {

  source?: DugonMediaSource
  userId?: string
  //
  type: StreamType 

  pid?: string

  constructor(public track: MediaStreamTrack, type?: StreamType) {
    this.type = type? type: StreamType.Local
  }

  get kind() {
    return this.track.kind;
  }

  get id() {
    if(this.type === StreamType.Local && this.pid === undefined){
      return this.track.id
    }
    return this.pid!
  }

  static async createLocalStream(config: CreateLocalStreamConfig) {
    const video = config.video ? config.video : false;
    const audio = config.audio ? config.audio : false;
    const share = config.share ? config.share : false;

    let tracks: MediaStreamTrack[]
    if (video) {
      const stream = await navigator.mediaDevices.getUserMedia({
        video, audio
      });
      tracks = stream.getTracks();
    } else if (share) {
      // TODO(cc): 10/20/24 
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video, audio
      });
      tracks = stream.getTracks();

    } else if (audio) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio
      });
      tracks = stream.getTracks();

    } else {
      tracks = [];
    }
    if (tracks && tracks.length > 0) {
      const streams = []
      for(const track of tracks){
        const stream = new Stream(track)
        streams.push(stream);
      }
      return streams;
    }
    return null;
  }

  initPubInfo(pid: string, metadata: any) {

  }

  initStream(userId: string, source: DugonMediaSource) {

  }

  play(element: PlaySource | null ) {
    let mediaElement: HTMLMediaElement| null;
    if(typeof element === 'string'){
      mediaElement = document.querySelector(element);
    }else{
      mediaElement = element;
    }

    // TODO(cc): 10/15/24 check element
    let stream: MediaStream;
    if (mediaElement !== null) {
      if(mediaElement.srcObject instanceof MediaStream ){
        stream = mediaElement.srcObject;
        stream.addTrack(this.track);
      }else{
        stream = new MediaStream();
        stream.addTrack(this.track);
        mediaElement.srcObject = stream;
      }
    }
  }




};