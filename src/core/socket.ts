import { randomIntId } from './utils';

// TODO(cc): 10/22/24 add timeout
class Packet {
  ack: Function
  fail: Function
  constructor(y: Function, n: Function) {
    this.ack = (data: object) => {
      y(data);
    };
    this.fail = (error: Error) => {
      n(error);
    };
  }
}

export default class Socket {
  packets: Map<number, Packet> = new Map();
  ws: WebSocket | null = null;

  //event
  onnotification?: ((event: string, data: object) => void);
  onopen?: (() => void)
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
      let data = JSON.parse(event.data);
      let { id, method, params } = data;
      if (method === 'response') {
        let packet = this.packets.get(id);
        if (packet) {
          packet.ack(params);
        }
      } else if (method === 'notification') {
        let { event, data } = params;
        if (this.onnotification) this.onnotification(event, data);
      }
    }

    this.ws.onclose = () => {
      if (this.onclose) this.onclose();
    }

    this.ws.onopen = event => {
      if (this.onopen) this.onopen();
    };
  }

  async request(params: object) {
    const id = randomIntId(8);

    this.sendJSON({
      'method': 'request',
      id,
      params,
    });

    const executor = (y: Function, n: Function) => {
      const packet = new Packet(y, n);

      this.packets.set(id, packet);
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