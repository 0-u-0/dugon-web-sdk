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

function createRemoteVideo(id) {
    const videoBox = document.createElement('div');
    videoBox.id = `videoBox-${id}`;

    const newVideo = document.createElement('video');
    newVideo.id = `video-${id}`;
    newVideo.controls = true;
    newVideo.autoplay = true;
    newVideo.muted = true;
    newVideo.style.width = "400px";
    newVideo.style.height = "400px";

    videoBox.append(newVideo);

    $('#videoList').append(videoBox);
}

function removeRemoteVideo(id) {
    $(`#videoBox-${id}`).remove();
}

async function initSession(username, room) {
    const signalServer = `ws://192.168.97.138:8800`;

    const myUserId = randomId(10);
    session = Dugon.createSession(signalServer, room, myUserId, "", { username });

    session.onuser = (userId, state, metadata) => {
        console.log('user', userId, state);
        if (state === 'in') {
            createRemoteVideo(userId);
        } else if (state === 'out') {
            removeRemoteVideo(userId);
        }
    };

    session.onclose = _ => {

    };

    session.onsender = (senderId, remoteUserId, metadata) => {
        if (remoteUserId == myUserId) {
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

        media.play(`#video-${receiver.userId}`);
    };


    session.onunsubscribed = (receiver) => {

    };

    await session.connect({ pub: pub, sub: true });

    if (pub) {
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
// let localStream = new MediaStream();

async function main() {
    if (pub) {
        videoSource = await Dugon.createVideoSource();
        videoSource.play('#localVideo');

        audioSource = await Dugon.createAudioSource();
        audioSource.play('#localVideo');
    }

    await initSession(randomId(5), roomId);

}

main();