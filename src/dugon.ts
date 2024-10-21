
import type {
  RoomConfig
} from './room'

import type {
  CreateLocalStreamConfig,
  PlaySource
} from './stream'

import Room from './room';
import Stream from './stream'
/**
 * The Entry of SDK
 */
export default class Dugon {

  public static Room(url: string, config?: RoomConfig) {
    return new Room(url, config);
  }

  public static async Stream(config: CreateLocalStreamConfig){
    return await Stream.createLocalStream(config);
  }

  public static async Play(streams :Stream[], source: PlaySource ){
    streams.forEach(stream=>stream.play(source));
  }

  /**
 * 
 * @param url 
 * @param sessionId 
 * @param tokenId 
 * @param metadata 
 */
  // public static createSession(url: string, sessionId: string, userId: string, tokenId: string, metadata: object) {
  //   return new Session(url, sessionId, userId, tokenId, metadata);
  // }


  // /**
  //  * 
  //  * @param width 
  //  * @param height 
  //  * @param fps 
  //  * @param mandatory 
  //  * @param deviceId 
  //  */
  // public static async createVideoSource(width: number = 320, height: number = 240, fps: number = 15, mandatory: boolean = false, deviceId?: string) {

  //   let constraints: {};

  //   if (mandatory) {
  //     constraints = {
  //       width: { exact: width }, height: { exact: height }, frameRate: { exact: fps }, deviceId: { exact: deviceId },
  //     }
  //   } else {
  //     constraints = {
  //       width: { ideal: width }, height: { ideal: height }, frameRate: { ideal: fps }, deviceId: { ideal: deviceId },
  //     }
  //   }
  //   const stream = await navigator.mediaDevices.getUserMedia({
  //     video: constraints
  //   });
  //   const [videoTrack] = stream.getVideoTracks();
  //   return new DugonMediaSource(videoTrack);
  // }

  // static async createAudioSource() {
  //   const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  //   const [audioTrack] = stream.getAudioTracks();
  //   return new DugonMediaSource(audioTrack);
  // }

  // static async createScreenSharingSource() {
  //   const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
  //   const [screenTrack] = stream.getVideoTracks();
  //   return new DugonMediaSource(screenTrack);
  // }

  // static createMediaSource(mediaTrack: MediaStreamTrack) {
  //   return new DugonMediaSource(mediaTrack);
  // }

}

