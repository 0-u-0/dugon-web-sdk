import DugonMediaSource from "./core/mediasource";
import { StrDic } from "./core/remoteParameters";
import Session from "./core/session";
import { randomId } from "./core/utils";
import Stream from "./stream";
import User, { UserType } from "./user";


interface RoomConfig {
  tokenId?: string;

  roomId?: string;
  userId?: string;
  userName?: string;
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

  constructor(url: string, config?: RoomConfig) {
    this.url = url;

    this.id = config?.roomId ?? "89757";

    const userName = config?.userName ?? "Anonym";
    const userId = config?.userId ?? randomId(7);
    const userData = config?.userData ?? {};

    userData["name"] = userName;

    this.user = new User(userId, UserType.Local, userData);

    this.users = new Map();
    this.streams = new Map();
    this.localStreams = new Map();

    this.tokenId = config?.tokenId ?? "";

    this.session = new Session(this.url, this.id, userId, this.tokenId, userData);
  }

  public async connect() {
    this.session.onjoined = () => {
      if(this.onuser) this.onuser(this.user);
    };

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
      }
    };

    // this.session.onpub = (pub)
    this.session.onpub = (remoteUserId, pubId, trackId, metadata) => {
      if (remoteUserId == this.user.id) {
        const stream = this.localStreams.get(trackId);
        if (stream) {
          stream.pid = pubId;
          this.localStreams.delete(trackId);
          this.streams.set(pubId, stream);

          if (this.user.onstream) this.user.onstream(stream);
        }

        // console.log('local', pubId, metadata);
      } else {
        // session.subscribe(pubId);
      }
    };


    this.session.onclose = () => {
      if (this.onclose) this.onclose();
    };

    // TODO(cc): 10/20/24 config
    return this.session.connect({ pub: true, sub: true });
  }

  publish(localStreams: Stream[]) {
    localStreams.forEach(stream => {
      if (!this.localStreams.has(stream.id)) {
        this.localStreams.set(stream.id, stream);
        this.session.publish(stream);
      }
    })
    // for(const stream: localStreams){

    // }
  }


}

export type {
  RoomConfig
}

export default Room;