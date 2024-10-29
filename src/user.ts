import { StrDic } from "./core/remoteParameters";
import Stream from "./stream";


export enum UserType {
  Local = "local",
  Remote = "remote",
}

export default class User {

  name: string

  streams: Map<string, Stream>;


  onleave: (() => void) | null = null;
  onstream: ((stream: Stream) => void) | null = null;

  constructor(public id: string, public type: UserType, public data: StrDic) {
    this.name = data["name"]
    this.streams = new Map();
  }

  addStream(id: string, stream: Stream) {

  }

  getStream() {

  }

  deleteStream() {

  }

  isStreamEmpty() {
    return this.streams.size === 0;
  }
}