import {createBoat} from '../../src/physics.js';
import {createTowRig,towStep} from '../../src/towing.js';
import {PORT_ROADS} from '../../src/port-roads.js';
// Test driver only, not shipped autopilot. Follow a dense centreline at 3 m/s
// so the regression exercises the actual tyres, hitch, grade and collisions.
export function driveHarbourRoad(){
 const b=createBoat('lake',{profile:'cruiser',coldStart:true}),r=createTowRig(b,{loaded:true,misalignment:0});
 const coarse=PORT_ROADS.flatMap((q,i)=>i?q.points.slice(1):q.points),path=coarse.flatMap((b,i)=>{if(!i)return[b];const a=coarse[i-1],n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/2);return Array.from({length:n},(_,j)=>({x:a.x+(b.x-a.x)*(j+1)/n,y:a.y+(b.y-a.y)*(j+1)/n}));});
 r.engine.key='running';r.gear='D';r.awd=true;let index=0,pitch=0;
 for(let i=0;i<1500*120;i++){
  while(index<path.length-1&&Math.hypot(path[index].x-r.car.x,path[index].y-r.car.y)<8)index++;
  const p=path[index],dx=p.x-r.car.x,dy=p.y-r.car.y,d=Math.hypot(dx,dy),alpha=Math.atan2(Math.sin(Math.atan2(dy,dx)-r.car.a),Math.cos(Math.atan2(dy,dx)-r.car.a));
  r.steer=Math.max(-.59,Math.min(.59,Math.atan(2*2.9*Math.sin(alpha)/Math.max(7,d))));r.gas=Math.abs(r.speed)<3?.3:0;r.brake=Math.abs(r.speed)>4?.4:0;towStep(r,b,1/120);pitch=Math.max(pitch,Math.abs(r.car.pitch));
  if(index===path.length-1&&d<9)return{r,index,pitch,complete:true};
 }
 return{r,index,pitch,complete:false};
}
