import { StrDic } from "./core/remoteParameters";
import Stream from "./stream";


export enum UserType {
  Local = "local",
  Remote = "remote",
}

export default class User {

  name: string

  onleave: (() => void) | null = null;
  onstream: ((stream: Stream) => void) | null = null;

  constructor(public id: string, public type: UserType, public data: StrDic) {
    this.name = data["name"]
  }
}