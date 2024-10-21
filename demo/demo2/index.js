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

    $('#videoList').append(videoBox);
}

function removeRemoteVideo(id) {
    $(`#videoBox-${id}`).remove();
}

async function main() {

  const signalServer = `ws://192.168.97.138:8800`;

  let streams;
  const room = Dugon.Room(signalServer);
  console.log(room)
  room.onuser = async user=>{
    if(user.type === 'local'){
      console.log('join!')
      if(pub){
        streams = await Dugon.Stream({video:true, audio:true});
        Dugon.Play(streams, '#localVideo');
        room.publish(streams);
      }
    } else {
      createRemoteVideo(user.id);

      user.onstream = (stream)=>{
        console.log('remote stream');
        room.subscribe(stream);
        // stream.on
        stream.onsub = ()=>{
          stream.play(`#video-${user.id}`)
        };
      };      
    }
  };

  room.onleave = async user=>{
    
  };

  room.connect();
}

main();