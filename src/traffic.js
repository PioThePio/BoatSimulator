import {TRAFFIC,environment,waveAt,clamp} from './world.js';
import {point,inverseMass,impulse} from './rigging.js';
export function createTraffic(){return TRAFFIC.map((q,i)=>({...q,homeX:q.x,homeY:q.y,homeA:q.a,vx:0,vy:0,w:0,phase:i*1.7,heave:0,roll:0}));}
export function trafficStep(b,e,dt){
 if(!e.traffic)return;
 for(const q of b.traffic){
  const flow=environment(b.time,e,q.x,q.y),wave=waveAt(q.x,q.y,b.time,e),m=q.mass;
  q.heave+=(wave.eta-q.heave)*(1-Math.exp(-dt*2.5));q.roll+=(Math.atan(-wave.sx*Math.sin(q.a)+wave.sy*Math.cos(q.a))-q.roll)*(1-Math.exp(-dt*3));
  // Two mooring restraints with damping, plus wind and current loads.
  q.vx+=((q.homeX-q.x)*.8-q.vx*1.4+flow.current.x*.12+flow.wind.x*Math.abs(flow.wind.x)*.0005+wave.ax*.10)*dt;
  q.vy+=((q.homeY-q.y)*.8-q.vy*1.4+flow.current.y*.12+flow.wind.y*Math.abs(flow.wind.y)*.0005+wave.ay*.10)*dt;
  q.w+=(Math.sin(q.homeA-q.a)*.8-q.w*1.6+Math.sin(b.time*.9+q.phase)*(e.windSpeed??0)*.0008)*dt;
  q.x+=q.vx*dt;q.y+=q.vy*dt;q.a+=q.w*dt;
  const r=b.spec.beam*.45,offset=b.spec.length*.5-r;
  for(const s of [-1,0,1]){
   const p=point(b,s*offset,0),dx=p.x-q.x,dy=p.y-q.y,c=Math.cos(q.a),sn=Math.sin(q.a);
   const along=clamp(dx*c+dy*sn,-q.length*.5+q.beam*.45,q.length*.5-q.beam*.45);
   const near={x:q.x+c*along,y:q.y+sn*along},rx=p.x-near.x,ry=p.y-near.y,d=Math.hypot(rx,ry),penetration=r+q.beam*.45-d;
   if(penetration<=0||d<.001)continue;
   const n={x:rx/d,y:ry/d},arm={x:p.x-b.x,y:p.y-b.y},other={x:near.x-q.x,y:near.y-q.y};
   const rel=(b.vx-b.w*arm.y-q.vx+q.w*other.y)*n.x+(b.vy+b.w*arm.x-q.vy-q.w*other.x)*n.y;
   if(rel<0){const lever=other.x*n.y-other.y*n.x,iz=m*(q.length*q.length+q.beam*q.beam)/12,j=-rel/(inverseMass(b,n,arm)+1/m+lever*lever/iz);impulse(b,n,j,arm);q.vx-=n.x*j/m;q.vy-=n.y*j/m;q.w-=lever*j/iz;
    if(-rel>.3&&(!b.lastTrafficImpact||b.time-b.lastTrafficImpact>1)){b.damage=clamp(b.damage+(-rel)**2*12,0,100);b.events.unshift({time:b.time,message:`Kontakt z zacumowaną jednostką: ${(-rel).toFixed(2)} m/s.`});b.lastTrafficImpact=b.time;}
   }
   b.x+=n.x*penetration*.6;b.y+=n.y*penetration*.6;q.x-=n.x*penetration*.2;q.y-=n.y*penetration*.2;
  }
 }
}
