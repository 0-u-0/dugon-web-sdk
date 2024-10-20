const urlObject = new URL(document.location.href);
const roomId = urlObject.searchParams.get("room");
const pub = urlObject.searchParams.get("pub") === 'true';

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
      user.onstream = (stream)=>{

      };
      
    }
  };
  room.connect();
}

main();