export default class DugonMediaSource {
  constructor(public track: MediaStreamTrack) {

  }

  get kind() {
    return this.track.kind;
  }

}