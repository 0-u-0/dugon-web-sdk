import Publisher from "./core/publisher";
import { Session } from "./core/session";
import { generateUUID } from "./core/utils";


export type PlaySource = HTMLMediaElement | string;

export interface CreateLocalStreamConfig {
  video?: boolean
  audio?: boolean
  share?: boolean
}

export enum StreamType {
  Local = "local",
  Remote = "remote",
}

// LocalStream,

export default class Stream {

  type: StreamType

  id: string = generateUUID()
  userId?: string
  pid?: string
  sid?: string

  session?: Session
  track?: MediaStreamTrack

  onsub: (() => void) | null = null;
  onclose: (() => void) | null = null;
  onpause: (() => void) | null = null;
  onresume: (() => void) | null = null;

  constructor(type?: StreamType) {
    this.type = type ? type : StreamType.Local
  }

  get kind() {
    if (this.track) {
      return this.track.kind;
    } else {
      return 'unknown'
    }
  }

  get trackId() {
    if (this.track) {
      return this.track.id;
    } else {
      return "";
    }
  }

  // TODO(cc): 10/21/24 use uuid
  // get id() {
  //   if(this.type === StreamType.Local && this.pid === undefined){
  //     return this.track.id
  //   }
  //   return this.pid!
  // }

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
      for (const track of tracks) {
        const stream = new Stream()
        stream.track = track;
        streams.push(stream);
      }
      if (streams.length === 1) {
        return streams[0];
      }
      return streams;
    }
    return null;
  }

  initPubInfo(pid: string, metadata: any) {

  }


  // TODO(cc): 10/25/24 save mediastream, release track when unsub
  // TODO(cc): 10/21/24 mute local audio
  play(player: PlaySource | null) {
    // TODO(cc): 10/21/24  check element

    if (this.track === undefined) {
      // TODO(cc): 10/21/24 throw error
      return
    }

    let mediaElement: HTMLMediaElement | null;
    if (typeof player === 'string') {
      mediaElement = document.querySelector(player);
    } else {
      mediaElement = player;
    }

    // TODO(cc): 10/15/24 check element
    let stream: MediaStream;
    if (mediaElement !== null) {
      if (mediaElement.srcObject instanceof MediaStream) {
        stream = mediaElement.srcObject;
        stream.addTrack(this.track);
      } else {
        stream = new MediaStream();
        stream.addTrack(this.track);
        mediaElement.srcObject = stream;
      }
    }
  }

  // TODO(cc): 10/24/24 add state, 
  pause() {
    if (this.session) {
      this.session?.pause(this.pid!);
    }
  }

  resume() {
    if (this.session) {
      this.session?.resume(this.pid!);
    }
  }

  close() {
    if (this.session) {
      if(this.type === StreamType.Local){
        this.session?.unpublish(this.pid!);
      }else{
        this.session.unsubscribe(this.pid!);
      }
    }
  }

};