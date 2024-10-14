import { Metadata } from './metadata';
import Media from './media';

export default class Sender {
  id = ''
  media : Media | null = null;
  constructor(public track: MediaStreamTrack, public transceiver: RTCRtpTransceiver,public metadata: Metadata) {

  }

  changeTrackState(enabled:boolean){
    this.track.enabled = enabled;
  }

  get kind() {
    return this.track.kind;
  }

  // defined after setLocalDescription
  get mid() {
    return this.transceiver.mid;
  }

  get available() {
    return !(this.transceiver.direction === 'inactive');
  }

  // get isStopped() {
  //   return this.transceiver.stopped;
  // }



}