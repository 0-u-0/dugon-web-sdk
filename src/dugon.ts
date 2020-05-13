import Session from './session';
import DugonMediaSource from './mediasource';

declare global {
  interface MediaDevices {
    getDisplayMedia(constraints: MediaStreamConstraints): Promise<MediaStream>;
  }
}

export default class Dugon {

  static createSession(url: string, sessionId: string, tokenId: string, metadata: object) {
    return new Session(url, sessionId, tokenId, { metadata });
  }

  static async createVideoSource() {
    //TODO(CC): add resolution, fps,deviceId , is mandatory ,to config
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const [videoTrack] = stream.getVideoTracks();
    return new DugonMediaSource(videoTrack);
  }

  static async createAudioSource() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const [audioTrack] = stream.getAudioTracks();
    return new DugonMediaSource(audioTrack);
  }

  static async createScreenSharingSource() {
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
    const [screenTrack] = stream.getVideoTracks();
    return new DugonMediaSource(screenTrack);
  }

}

