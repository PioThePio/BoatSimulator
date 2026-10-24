export function voyageEvent(b,event){
 b.logSequence=(b.logSequence??0)+1;b.logEvents??=[];b.logEvents.push({sequence:b.logSequence,time:b.time,...event});b.logEvents.splice(0,Math.max(0,b.logEvents.length-80));
 if(event.type==='impact')b.collisionCount=(b.collisionCount??0)+1;
}
