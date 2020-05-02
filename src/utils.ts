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
    throw TypeError(`${varName} must be string.`)
  }
}

export function objectChecker(x: any, varName: string) {
  if (!isObject(x)) {
    throw TypeError(`${varName} must be object.`)
  }
}



export function randomInitId(length: number) {
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
