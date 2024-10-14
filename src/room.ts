import DugonMediaSource from "./core/mediasource";
import Session from "./core/session";
import { randomId } from "./core/utils";

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
  userName: string;
  userId: string;
  tokenId?: string;
  userData?: any;


  constructor(url: string, config?: RoomConfig) {
    this.url = url;

    this.id = config?.roomId ?? "89757";

    this.userName = config?.userName ?? "Anonym";
    this.userId = config?.userId ?? randomId(7);
    this.userData = config?.userData ?? null;

    this.tokenId = config?.tokenId ?? "";

    this.session = new Session(this.url, this.id, this.userId, this.tokenId, {
      userName: this.userName,
    });
  }

  public async connect(config:any) {
    return this.session.connect(config);
  }

  publish(source: DugonMediaSource, config:any) {
    this.session.publish(source,config);
  }

  unpublish(senderId: string) {
   this.session.unpublish(senderId);
  }

  async subscribe(senderId: string) {
    this.session.subscribe(senderId);
  }

  unsubscribe(senderId: string) {
    this.session.unsubscribe(senderId);
  }

  //senderId
  pause(id: string) {
    this.session.pause(id);
  }

  //senderId
  resume(id: string) {
    this.session.resume(id);
  }
}

export type {
  RoomConfig
}

export default Room;