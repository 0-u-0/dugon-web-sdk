import { randomInitId } from './utils';

class Packet {
  resolve: Function
  reject: Function
  constructor(y: Function, n: Function) {
    this.resolve = (data: object) => {
      y(data);
    };
    this.reject = (error: Error) => {
      n(error);
    };
  }
}

export default class Socket {
  messages: Map<number, Packet> = new Map();
  ws: WebSocket | null = null;

  //event
  onnotification?: ((event: string, data: object) => void);
  onclose?: (() => void)
  constructor(public url: string, public params: object) {
  }

  private getFullURL() {
    let urlObj = new URL(this.url);
    let encoded = btoa(JSON.stringify(this.params));
    urlObj.searchParams.set('params', encoded);
    return urlObj.toString();
  }

  init() {
    //TODO: add protocol
    this.ws = new WebSocket(this.getFullURL());

    this.ws.onmessage = event => {
      let response_data = JSON.parse(event.data);
      let { id, method, data, type } = response_data;
      if (type === 'response') {
        let packet = this.messages.get(id);
        if (packet) {
          packet.resolve(data);
        }
      } else if (type === 'notify') {
        if (this.onnotification) this.onnotification(method, data);
      }
    }

    this.ws.onclose = () => {
      if (this.onclose) this.onclose();
    }

    //TODO: error
    const executor = (y: Function, n: Function) => {
      //TODO: ???
      if (this.ws) {
        this.ws.onopen = event => {
          y();
        };
      }
    }

    return new Promise(executor);
  }

  async request(method: string, data: object) {
    const id = randomInitId(8);

    this.sendJSON({
      type: 'request',
      method,
      id,
      data,
    });

    const executor = (y: Function, n: Function) => {
      const packet = new Packet(y, n);

      this.messages.set(id, packet);
    }

    return new Promise(executor);
  }

  sendJSON(json: object) {
    try {
      let jsonString = JSON.stringify(json);
      if (this.ws) {
        this.ws.send(jsonString)
      }
    } catch (e) {
      // TODO:
    }
  }


}