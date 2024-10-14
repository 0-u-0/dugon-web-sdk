
import Media from './media'

const validFilter = RegExp.prototype.test.bind(/^([a-z])=(.*)/);


declare global {
  interface String {
    splitOnce(separator: string): Array<string>;
  }
}
//TODO: use regex later
String.prototype.splitOnce = function (separator: string): Array<string> {
  const [first, ...rest] = this.split(separator)
  if (rest.length > 0) {
    return [first, rest.join(separator)]
  } else {
    return [this.toString()]
  }
}


interface Fingerprint {
  algorithm: string
  hash: string
}

export default class Sdp {
  version = 0;
  origin = '- 10000 2 IN IP4 127.0.0.1';
  timing = '0 0';
  name = '-'
  iceLite = true;

  msidSemantic = ' WMS *';

  fingerprint: Fingerprint | null = null

  medias: Array<Media> = []
  constructor() {

  }

  toString() {
    let lines = []
    if (this.version != null) {
      lines.push(`v=${this.version}`)
    }

    if (this.origin) {
      lines.push("o=- 10000 2 IN IP4 127.0.0.1")
    }

    if (this.name) {
      lines.push(`s=${this.name}`)
    }

    if (this.timing) {
      lines.push(`t=${this.timing}`)
    }

    if (this.iceLite) {
      lines.push(`a=ice-lite`);
    }

    if (this.msidSemantic) {
      lines.push(`a=msid-semantic:${this.msidSemantic}`)
    }

    let mids = this.medias.filter(m => m.available || m.mid == '0').map(m => m.mid).join(' ')
    lines.push(`a=group:BUNDLE ${mids}`)

    if (this.fingerprint) {
      lines.push(`a=fingerprint:${this.fingerprint.algorithm} ${this.fingerprint.hash}`)
    }

    for (let media of this.medias) {
      lines.push(media.toSdp())
    }

    let sdp = lines.join('\r\n')

    sdp = sdp + '\r\n'
    return sdp
  }
}
