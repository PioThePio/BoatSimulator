// Screen-space placement keeps text legible without drawing names over names.
export function placeMapLabels(candidates,measure,width,height,blocked=[]){
 const used=[...blocked],placed=[];
 for(const q of [...candidates].sort((a,b)=>(b.priority??0)-(a.priority??0))){
  const w=measure(q.text)+8,h=15;
  for(const [dx,dy]of [[8,-17],[8,6],[-w-8,-17],[-w-8,6],[8,-35],[-w-8,24]]){
   const box={x:q.x+dx,y:q.y+dy,w,h};
   if(box.x<6||box.y<6||box.x+w>width-6||box.y+h>height-6||used.some(p=>box.x<p.x+p.w+4&&box.x+w+4>p.x&&box.y<p.y+p.h+3&&box.y+h+3>p.y))continue;
   placed.push({...q,...box});used.push(box);break;
  }
 }return placed;
}
