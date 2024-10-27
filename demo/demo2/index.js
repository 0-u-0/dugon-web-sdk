const urlObject = new URL(document.location.href);
const roomId = urlObject.searchParams.get("room");
const pub = urlObject.searchParams.get("pub") === 'true';

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
  videoBox.append(document.createElement('br'));

  $('#videoList').append(videoBox);

}

function removeRemoteVideo(id) {
  $(`#videoBox-${id}`).remove();
}

function addButtonForStream(label, fatherElement, stream) {
  // fatherElement
  const pauseButton = document.createElement('button');
  pauseButton.onclick = () => {
    stream.pause();
  };
  pauseButton.textContent = label + " pause";

  const resumeButton = document.createElement('button');
  resumeButton.onclick = () => {
    stream.resume();
  };
  resumeButton.textContent = label + " resume";
  //

  const closeButton = document.createElement('button');
  closeButton.onclick = () => {
    stream.close();
  };
  closeButton.textContent = label + " close";


  fatherElement.append(closeButton);
  fatherElement.append(pauseButton);
  fatherElement.append(resumeButton);
}



async function main() {

  const signalServer = `ws://192.168.97.138:8800`;

  let streams;
  const room = Dugon.Room(signalServer);
  console.log(room)
  room.onuser = async user => {

    createRemoteVideo(user.id);

    user.onstream = (stream) => {
      console.log('remote stream');
      room.subscribe(stream);
      // stream.on
      stream.onsub = () => {
        stream.play(`#video-${user.id}`);

        addButtonForStream(stream.kind, $(`#videoBox-${user.id}`), stream);
      };

      stream.onclose = () => {
        console.log('close');
      };

      stream.onpause = () => {
        console.log('pause');
      };

      stream.onresume = () => {
        console.log('resume');
      };
    };

    user.onleave = () => {
      removeRemoteVideo(user.id);
    };
  };



  await room.connect();

  console.log('join!')
  if (pub) {
    streams = await Dugon.Stream({ video: true, audio: true });
    Dugon.Play(streams, '#localVideo');
    room.publish(streams);

    addButtonForStream('audio', $('#localVideoBox'), streams[0]);
    addButtonForStream('video', $('#localVideoBox'), streams[1]);
  }

}

main();