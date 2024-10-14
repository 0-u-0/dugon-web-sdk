import { StrDic } from './remoteParameters';

//FIXME(CC): inteface
export default class RemoteSender {
  constructor(public area: string, public host: string, public mediaId: string,
    public userId: string, public transportId: string, public senderId: string,
    public metadata: StrDic) {

  }
}