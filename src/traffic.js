import {sampleWakeField} from './wake.js';
import {TRAFFIC,BOLLARDS,environment,waveAt,reflectionFacesNear,clamp} from './world.js';
import {point,cleat,inverseMass,impulse} from './rigging.js';
import {hullLateralForces,windForces} from './hydrodynamics.js';
import {mooringPoint,boomInverse,boomLoad} from './marina.js';
import {FENDERS,recordImpact} from './impacts.js';
export function createTraffic(){return TRAFFIC.map(q=>{
 const spec={length:q.length,beam:q.beam,mass:q.mass,draft:q.type==='sail'?.65:q.type==='pwc'?.2:.38,freeboard:q.type==='sail'?1.1:q.type==='pwc'?.3:.65,mx:q.mass*1.08,my:q.mass*1.65,iz:1.55*q.mass*((q.length*.27)**2+(q.beam*.22)**2)};
 const boat={...q,spec,homeX:q.x,homeY:q.y,homeA:q.a,vx:0,vy:0,w:0,heave:0,roll:0,pitch:0,heaveVelocity:0,rollVelocity:0,pitchVelocity:0};
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

export function trafficStep(b,e,dt){
 if(!e.traffic)return;
 for(const q of b.traffic){
  const faces=b.wake.length>1?reflectionFacesNear(q.x,q.y):[];
  const sample=(x,y)=>{const w=waveAt(x,y,b.time,e),wake=sampleWakeField(b.wake,x,y,b.time,faces);for(const key of Object.keys(wake))w[key]+=wake[key];return w;};
  const flow=environment(b.time,e,q.x,q.y),wave=sample(q.x,q.y),m=q.mass;
  const windSide=-flow.wind.x*Math.sin(q.a)+flow.wind.y*Math.cos(q.a),rollTarget=Math.atan(-wave.sx*Math.sin(q.a)+wave.sy*Math.cos(q.a))*1.3+windSide*Math.abs(windSide)*q.spec.freeboard/(m*2);
  for(const [key,target,omega,damping]of [['heave',wave.eta,3.8,.34],['roll',clamp(rollTarget,-.25,.25),Math.sqrt(9.81/(q.beam*.35)),.24],['pitch',Math.atan(wave.sx*Math.cos(q.a)+wave.sy*Math.sin(q.a)),3.5,.4]]){const velocity=key+'Velocity';q[velocity]+=(omega*omega*(target-q[key])-2*damping*omega*q[velocity])*dt;q[key]+=q[velocity]*dt;}
  const c0=Math.cos(q.a),s0=Math.sin(q.a),u=(q.vx-flow.current.x)*c0+(q.vy-flow.current.y)*s0,v=-(q.vx-flow.current.x)*s0+(q.vy-flow.current.y)*c0;
  let X=0,Y=0,N=0;const force=(x,y,px=0)=>{X+=x;Y+=y;N+=px*y;};
  hullLateralForces(q.spec,u,v,q.w,0,force);
  force(-.5*1000*q.beam*q.spec.draft*.20*u*Math.abs(u)-m*.035*u,0);
  const ax=flow.wind.x-q.vx,ay=flow.wind.y-q.vy;windForces(q.spec,ax*c0+ay*s0,-ax*s0+ay*c0,q.w,force);
  for(const x of [-.35*q.length,.35*q.length]){const p=point(q,x,0),w=sample(p.x,p.y);force(m*.08*(w.ax*c0+w.ay*s0),m*.20*(-w.ax*s0+w.ay*c0),x);}
  const du=(X+m*v*q.w)/q.spec.mx-q.w*v,dv=(Y-m*u*q.w)/q.spec.my+q.w*u;
  q.vx+=(c0*du-s0*dv)*dt;q.vy+=(s0*du+c0*dv)*dt;
  q.w+=(N/q.spec.iz-q.w*.18-500*q.beam*q.length**4*.006*q.w*Math.abs(q.w)/q.spec.iz)*dt;
  moorTraffic(b,q,dt);
  q.x+=q.vx*dt;q.y+=q.vy*dt;q.a+=q.w*dt;
  const r=b.spec.beam*.45,offset=b.spec.length*.5-r;
  const contacts=[...(b.fenders?FENDERS.map(f=>({x:f.x*b.spec.length,y:f.y*b.spec.beam,r:b.spec.beam*.065,fender:f.id})):[]),...[-1,0,1].map(s=>({x:s*offset,y:0,r}))];
  for(const contactSample of contacts){
   const r=contactSample.r,p=point(b,contactSample.x,contactSample.y),dx=p.x-q.x,dy=p.y-q.y,c=Math.cos(q.a),sn=Math.sin(q.a);
   const along=clamp(dx*c+dy*sn,-q.length*.5+q.beam*.45,q.length*.5-q.beam*.45);
   const near={x:q.x+c*along,y:q.y+sn*along},rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),penetration=r+q.beam*.45-d;
   if(penetration<=0||d<.001)continue;
   const n={x:rx/d,y:ry/d},arm={x:p.x-b.x,y:p.y-b.y},other={x:near.x-q.x,y:near.y-q.y};
   const rel=(b.vx-b.w*arm.y-q.vx+q.w*other.y)*n.x+(b.vy+b.w*arm.x-q.vy-q.w*other.x)*n.y;
   if(rel<0){const effective=1/(inverseMass(b,n,arm)+inverseMass(q,n,other)),j=-rel*effective;impulse(b,n,j,arm);impulse(q,n,-j,other);
    const contact={x:arm.x-n.x*r,y:arm.y-n.y*r};
    recordImpact(b,{arm:contact,speed:-rel,effective,protectedContact:!!contactSample.fender,fender:contactSample.fender,target:'boat-'+q.id,dock:false},message=>{b.events.unshift({time:b.time,message});b.events=b.events.slice(0,12);});
   }
   b.x+=n.x*penetration*.6;b.y+=n.y*penetration*.6;q.x-=n.x*penetration*.2;q.y-=n.y*penetration*.2;
  }
 }
}
