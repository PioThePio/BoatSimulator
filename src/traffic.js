import {contacts} from './contacts.js';
import {nearbySolids} from './solid-index.js';
import {beginFenderStep,fenderGeometry,fenderContact} from './fenders.js';
import {hullContactSamples} from './hull-geometry.js';
import {sampleWater,wakeHistories} from './wave-field.js';
import {TRAFFIC,BOLLARDS,SOLIDS,environment,reflectionFacesNear,clamp} from './world.js';
import {point,cleat,inverseMass,impulse} from './rigging.js';
import {hullLateralForces,windForces} from './hydrodynamics.js';
import {mooringPoint,boomInverse,boomLoad} from './marina.js';
import {recordImpact} from './impacts.js';
export function createTraffic(){return TRAFFIC.map(q=>{
 const spec={length:q.length,beam:q.beam,mass:q.mass,draft:q.type==='sail'?.65:q.type==='pwc'?.2:.38,freeboard:q.type==='sail'?1.1:q.type==='pwc'?.3:.65,mx:q.mass*1.08,my:q.mass*1.65,iz:1.55*q.mass*((q.length*.27)**2+(q.beam*.22)**2)};
 const boat={...q,spec,fenders:true,fenderContacts:{},damage:0,dockDamage:0,events:[],homeX:q.x,homeY:q.y,homeA:q.a,vx:0,vy:0,w:0,heave:0,roll:0,pitch:0,heaveVelocity:0,rollVelocity:0,pitchVelocity:0};
 boat.ropes=q.ties.map(([end,id])=>{const p=cleat(boat,end),bollard=BOLLARDS.findIndex(q=>q.id===id),target=BOLLARDS[bollard];return{end,bollard,length:Math.hypot(p.x-target.x,p.y-target.y)+.12,tension:0};});
 return boat;
});}
function moorTraffic(world,q,dt){
 for(const r of q.ropes){
  const p=cleat(q,r.end),target=mooringPoint(world,r.bollard),dx=target.x-p.x,dy=target.y-p.y,d=Math.max(.001,Math.hypot(dx,dy));
  const n={x:dx/d,y:dy/d},arm={x:p.x-q.x,y:p.y-q.y},separation=(target.vx-q.vx+q.w*arm.y)*n.x+(target.vy-q.vy-q.w*arm.x)*n.y;
  const inv=inverseMass(q,n,arm)+boomInverse(world,r.bollard,n),k=120000/Math.max(1,r.length),damping=.85*Math.sqrt(k/inv);
  r.tension=d>r.length?Math.max(0,(k*(d-r.length)+(damping+k*dt)*separation)/(1+(damping*dt+k*dt*dt)*inv)):0;
  impulse(q,n,r.tension*dt,arm);boomLoad(world,r.bollard,-n.x*r.tension,-n.y*r.tension);
 }
}

export function trafficStep(b,e,dt,{integrate=true}={}){
 if(!e.traffic)return;
 for(const q of b.traffic){
  if(integrate){
  q.time=b.time;beginFenderStep(q);
  // Only new marina boats sample external fields at 20 Hz. Integration of
  // inertia, damping, contact and individual rope tension remains at 120 Hz.
  const cached=q.site==='pilawa'||q.site==='nieporet';
  if(!cached||!q.fieldCache||b.time>=q.fieldAt){
   const faces=wakeHistories(b).some(h=>h.length>1)?reflectionFacesNear(q.x,q.y):[],sample=(x,y)=>sampleWater(b,x,y,e,faces),fore=point(q,.35*q.length,0),aft=point(q,-.35*q.length,0);
   q.fieldCache={flow:environment(b.time,e,q.x,q.y),wave:sample(q.x,q.y),ends:[sample(aft.x,aft.y),sample(fore.x,fore.y)]};q.fieldAt=b.time+.05;
  }
  const {flow,wave,ends}=q.fieldCache,m=q.mass;
  const windSide=-flow.wind.x*Math.sin(q.a)+flow.wind.y*Math.cos(q.a),rollTarget=Math.atan(-wave.sx*Math.sin(q.a)+wave.sy*Math.cos(q.a))*1.3+windSide*Math.abs(windSide)*q.spec.freeboard/(m*2);
  for(const [key,target,omega,damping]of [['heave',wave.eta,3.8,.34],['roll',clamp(rollTarget,-.25,.25),Math.sqrt(9.81/(q.beam*.35)),.24],['pitch',Math.atan(wave.sx*Math.cos(q.a)+wave.sy*Math.sin(q.a)),3.5,.4]]){const velocity=key+'Velocity';q[velocity]+=(omega*omega*(target-q[key])-2*damping*omega*q[velocity])*dt;q[key]+=q[velocity]*dt;}
  const c0=Math.cos(q.a),s0=Math.sin(q.a),u=(q.vx-flow.current.x)*c0+(q.vy-flow.current.y)*s0,v=-(q.vx-flow.current.x)*s0+(q.vy-flow.current.y)*c0;
  let X=0,Y=0,N=0;const force=(x,y,px=0)=>{X+=x;Y+=y;N+=px*y;};
  hullLateralForces(q.spec,u,v,q.w,0,force);
  force(-.5*1000*q.beam*q.spec.draft*.20*u*Math.abs(u)-m*.035*u,0);
  const ax=flow.wind.x-q.vx,ay=flow.wind.y-q.vy;windForces(q.spec,ax*c0+ay*s0,-ax*s0+ay*c0,q.w,force);
  for(const [i,x]of [-.35*q.length,.35*q.length].entries()){const w=ends[i];const ax=w.ax+w.wake.ax*.7,ay=w.ay+w.wake.ay*.7;force(m*.08*(ax*c0+ay*s0),m*.20*(-ax*s0+ay*c0),x);}
  const du=(X+m*v*q.w)/q.spec.mx-q.w*v,dv=(Y-m*u*q.w)/q.spec.my+q.w*u;
  q.vx+=(c0*du-s0*dv)*dt;q.vy+=(s0*du+c0*dv)*dt;
  q.w+=(N/q.spec.iz-q.w*.18-500*q.beam*q.length**4*.006*q.w*Math.abs(q.w)/q.spec.iz)*dt;
  moorTraffic(b,q,dt);
  q.x+=q.vx*dt;q.y+=q.vy*dt;q.a+=q.w*dt;
  const candidates=cached?nearbySolids(SOLIDS,q.x,q.y,q.spec.length*.65+1):null;
  contacts(q,dt,candidates);
  }
  if(Math.hypot(b.x-q.x,b.y-q.y)>(b.spec.length+q.spec.length)*.6+1)continue;
  const otherRadius=q.beam*.45,offset=q.length*.5-otherRadius;
  if(b.fenders)for(const g of fenderGeometry(b.spec)){
   const p=point(b,g.x,g.y),dx=p.x-q.x,dy=p.y-q.y,c=Math.cos(q.a),s=Math.sin(q.a),along=clamp(dx*c+dy*s,-offset,offset),near={x:q.x+c*along,y:q.y+s*along};
   const rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),depth=g.radius+otherRadius-d;if(depth<=0||d<.001)continue;
   const n={x:rx/d,y:ry/d},arm={x:near.x-q.x,y:near.y-q.y};fenderContact(b,g,{n,depth,target:'boat-'+q.id,otherVelocity:{x:q.vx-q.w*arm.y,y:q.vy+q.w*arm.x},otherInverse:n=>inverseMass(q,n,arm),react:(n,j)=>impulse(q,n,j,arm)},dt,message=>{b.events.unshift({time:b.time,message});b.events.splice(12);});
  }
  for(const sample of hullContactSamples(b.spec)){
   const r=sample.radius,p=point(b,sample.x,0),dx=p.x-q.x,dy=p.y-q.y,c=Math.cos(q.a),sn=Math.sin(q.a),along=clamp(dx*c+dy*sn,-offset,offset),near={x:q.x+c*along,y:q.y+sn*along},rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),penetration=r+otherRadius-d;
   if(penetration<=0||d<.001)continue;
   const n={x:rx/d,y:ry/d},arm={x:p.x-b.x,y:p.y-b.y},other={x:near.x-q.x,y:near.y-q.y},rel=(b.vx-b.w*arm.y-q.vx+q.w*other.y)*n.x+(b.vy+b.w*arm.x-q.vy-q.w*other.x)*n.y;
   if(rel<0){const effective=1/(inverseMass(b,n,arm)+inverseMass(q,n,other)),j=-rel*effective;impulse(b,n,j,arm);impulse(q,n,-j,other);recordImpact(b,{arm:{x:arm.x-n.x*r,y:arm.y-n.y*r},speed:-rel,effective,target:'boat-'+q.id,dock:false},message=>{b.events.unshift({time:b.time,message});b.events.splice(12);});}
   b.x+=n.x*penetration*.6;b.y+=n.y*penetration*.6;q.x-=n.x*penetration*.2;q.y-=n.y*penetration*.2;
  }
 }
}
