import { StrDic } from "./core/remoteParameters";
import Session from "./core/session";
import { generateUUID } from "./core/utils";
import Stream, { StreamType } from "./stream";
import User, { UserType } from "./user";



interface RoomConfig {
  tokenId?: string;

  roomId?: string;
  userId?: string;
  username?: string;
  userData?: any
}

class Room {
  readonly url: string;
  readonly id: string;

  session: Session;
  //user
  tokenId?: string;
  userData?: StrDic;

  user: User

  users: Map<string, User>;

  streams: Map<string, Stream>;
  localStreams: Map<string, Stream>


  onuser: ((user: User) => void) | null = null;
  onclose: (() => void) | null = null;

  // TODO(cc): 10/21/24 auto subscribe
  constructor(url: string, config?: RoomConfig) {
    this.url = url;

    this.id = config?.roomId ?? "89757";

    const username = config?.username ?? "Anonym";
    const userId = config?.userId ?? generateUUID();
    const userData = config?.userData ?? {};

    userData["name"] = username;

    this.user = new User(userId, UserType.Local, userData);

    this.users = new Map();
    this.streams = new Map();
    this.localStreams = new Map();

    this.tokenId = config?.tokenId ?? "";

    this.session = new Session(this.url, this.id, userId, this.tokenId, userData);
  }

  public async connect() {

    this.session.onin = (userId, metadata) => {
      // TODO(cc): 10/18/24 check if existed
      const user = new User(userId, UserType.Remote, metadata);
      this.users.set(userId, user);
      if (this.onuser) this.onuser(user);
    };

    this.session.onout = (userId) => {
      const user = this.users.get(userId);
      if (user && user.onleave) {
        user.onleave();
        this.users.delete(userId);
      }
    };

    this.session.onmedia = (track, subscriber) => {
      const stream = this.streams.get(subscriber.publisherId);
      if(stream){
        stream.track = track;
        if(stream.onsub) stream.onsub();
      }
    };

    // this.session.onpub = (pub)
    this.session.onpub = (remoteUserId, pubId, trackId, metadata) => {
      if (remoteUserId === this.user.id) {
        const stream = this.localStreams.get(trackId);
        if (stream) {
          //
          stream.userId = this.user.id;
          stream.pid = pubId;
          //
          this.localStreams.delete(trackId);
          this.streams.set(pubId, stream);

          if (this.user.onstream) this.user.onstream(stream);
        }

        // console.log('local', pubId, metadata);
      } else {
        const user = this.users.get(remoteUserId);
        if (user) {
          const stream = new Stream(StreamType.Remote);

          stream.userId = remoteUserId;
          stream.pid = pubId;

          this.streams.set(pubId, stream);

          if (user.onstream) user.onstream(stream);
        }

        // session.subscribe(pubId);
      }
    };


    this.session.onclose = () => {
      if (this.onclose) this.onclose();
    };

    // TODO(cc): 10/20/24 config
    await this.session.connect({ pub: true, sub: true });
  }

  publish(localStreams: Stream[] | Stream) {
    let streams: Stream[]
    if(Array.isArray(localStreams)){
      streams = localStreams;
    }else{
      streams = [localStreams]
    }

    streams.forEach(stream => {
      // TODO(cc): 10/21/24 use stream id
      if (!this.localStreams.has(stream.trackId)) {
        this.localStreams.set(stream.trackId, stream);
        this.session.publish(stream);
      }
    })
    
  }

  subscribe(stream: Stream) {
    // TODO(cc): 10/21/24 check stream
    this.session.subscribe(stream.pid!)
  }


}

export type {
  RoomConfig
}

export default Room;