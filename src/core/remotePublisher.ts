import { StrDic } from './remoteParameters';

//FIXME(CC): inteface
export default class RemotePublisher {
  constructor(public area: string, public host: string, public mediaId: string,
    public userId: string, public transportId: string, public publisherId: string,
    public metadata: StrDic) {

  }
}