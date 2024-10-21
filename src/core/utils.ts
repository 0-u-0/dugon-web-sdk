import { SessionDescription } from 'sdp-transform';


function isNumber(x: any): x is number {
  return typeof x === "number";
}

function isString(x: any): x is string {
  return typeof x === "string";
}

function isObject(x: any): x is object {
  return typeof x === "object"
}

export function stringChecker(x: any, varName: string) {
  if (!isString(x)) {
    throw TypeError(`${varName} must be string, value:${typeof x}`)
  }
}

export function objectChecker(x: any, varName: string) {
  if (!isObject(x)) {
    throw TypeError(`${varName} must be object.`)
  }
}



export function randomIntId(length: number) {
  let randomNum = 0;
  while (randomNum < 0.1) {
    randomNum = Math.random();
  }
  return Math.ceil(randomNum * Math.pow(10, length));
}

export function getDtls(localSdpObj: SessionDescription) {
  // console.log(JSON.stringify(localSdpObj));
  for (let media of localSdpObj.media) {
    if (media.fingerprint) {
      const dtlsParameters =
      {
        setup: 'active',
        fingerprint: {
          algorithm: media.fingerprint.type,
          value: media.fingerprint.hash
        }
      };

      return dtlsParameters
    }
  }

  return null;
}

export function randomId(length: number) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function generateUUID() {
  // Generate an array of 16 random bytes
  const crypto = window.crypto;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Adjust specific bits according to RFC4122 section 4.4
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // 4 most significant bits of the 7th byte is 0100 (UUID version 4)
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // 2 most significant bits of the 9th byte is 10 (UUID variant 1)

  const byteToHex = [];
  for (let i = 0; i < 256; ++i) {
      byteToHex[i] = (i + 0x100).toString(16).substr(1);
  }

  // Convert bytes to hex values for UUID string
  const uuid = [
      byteToHex[bytes[0]], byteToHex[bytes[1]], byteToHex[bytes[2]], byteToHex[bytes[3]], '-',
      byteToHex[bytes[4]], byteToHex[bytes[5]], '-',
      byteToHex[bytes[6]], byteToHex[bytes[7]], '-',
      byteToHex[bytes[8]], byteToHex[bytes[9]], '-',
      byteToHex[bytes[10]], byteToHex[bytes[11]], byteToHex[bytes[12]], byteToHex[bytes[13]], byteToHex[bytes[14]], byteToHex[bytes[15]]
  ].join('');

  return uuid;
}