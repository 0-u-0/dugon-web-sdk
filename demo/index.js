const urlObject = new URL(document.location.href);
const roomId = urlObject.searchParams.get("room");
const pub = urlObject.searchParams.get("pub") === 'true';
const streams = new Map();

function randomId(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
  
const $ = document.querySelector.bind(document);

async function initSession(username, room) {
    const signalServer = `ws://192.168.97.138:8800`;

    const tokenId = randomId(10);
    session = Dugon.createSession(signalServer, room, tokenId, { username });

    session.onin = (tokenId, metadata) => {
        console.log(tokenId, ' in');

        const stream = new MediaStream();
        streams.set(tokenId, stream);
    };

    session.onout = tokenId => {
        console.log(tokenId, ' out');
    };

    session.onclose = _ => {

    };

    session.onsender = (senderId, remoteTokenId, metadata) => {
        if (remoteTokenId == tokenId) {
            console.log('local', senderId, metadata);
          } else {
            session.subscribe(senderId);
          }
    };
    // remote sender state changed
    session.onchange = (receiver, isPaused) => {

    };

    session.onmedia = (media, receiver) => {
        console.log('onmedia')

        const stream = streams.get(receiver.tokenId);
        if ($(`#videoBox-${receiver.tokenId}`)) {
          stream.addTrack(media.track);
        } else {

          console.log('???', receiver.tokenId);
          
          const videoBox = document.createElement('div');
          videoBox.id = `videoBox-${receiver.tokenId}`;

    
          const newVideo = document.createElement('video');
          newVideo.controls = true;
          newVideo.autoplay = true;
          newVideo.muted = true;
          newVideo.style.width = "400px";
          newVideo.style.height = "400px";
          
          stream.addTrack(media.track);
          newVideo.srcObject = stream;
          videoBox.append(newVideo);
    
          $('#videoList').append(videoBox);
        }
    
    };


    session.onunsubscribed = (receiver) => {

    };

    await session.connect({ pub: pub, sub: true });

    if(pub){
        if (audioSource) {
            session.publish(audioSource, { metadata: { name: 'audio' } });
        }
    
        if (videoSource) {
            session.publish(videoSource, { metadata: { name: 'video' } });
        }
    }
}

let videoSource;
let audioSource;
let localStream = new MediaStream();


async function main() {
    if(pub){
        videoSource = await Dugon.createVideoSource();
        localStream.addTrack(videoSource.track);
    
        audioSource = await Dugon.createAudioSource();
        localStream.addTrack(audioSource.track);
        $('#localVideo').srcObject = localStream;
    }

    await initSession(randomId(5), roomId);

}

main();