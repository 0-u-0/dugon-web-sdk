
export default class DugonMediaSource {
  constructor(public track: MediaStreamTrack) {

  }

  get kind() {
    return this.track.kind;
  }

  play(element: HTMLMediaElement | string | null ) {
    let mediaElement: HTMLMediaElement| null;
    if(typeof element === 'string'){
      mediaElement = document.querySelector(element);
    }else{
      mediaElement = element;
    }

    // TODO(cc): 10/15/24 check element
    let stream: MediaStream;
    if (mediaElement !== null) {
      if(mediaElement.srcObject instanceof MediaStream ){
        stream = mediaElement.srcObject;
        stream.addTrack(this.track);
      }else{
        stream = new MediaStream();
        stream.addTrack(this.track);
        mediaElement.srcObject = stream;
      }
    }
  }

}