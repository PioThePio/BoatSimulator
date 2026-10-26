import {point} from './rigging.js';
const empty=()=>({eta:0,sx:0,sy:0,vx:0,vy:0,ax:0,ay:0,driftX:0,driftY:0});
export function recordBrakingWave(b,current,dt){
 const speed=Math.hypot(b.vx-current.x,b.vy-current.y),previous=b.wakeSpeed??speed,deceleration=Math.max(0,(previous-speed)/dt),forward=(b.vx-current.x)*Math.cos(b.a)+(b.vy-current.y)*Math.sin(b.a);b.wakeSpeed=speed;b.brakingWaves??=[];
 const transition=(b.brakePlaning??b.planing)>.4&&deceleration>.4;
 b.brakePlaning=b.planing;
 if(deceleration<.1)b.brakeQuiet=(b.brakeQuiet??0)+dt;else b.brakeQuiet=0;
 if(b.brakeQuiet>.8)b.brakeEpisode=false;
 if(!b.brakeEpisode&&previous>2&&(deceleration>1.2||transition)&&b.time-(b.lastBrakeWave??-10)>.8&&Math.abs(forward)>speed*.4){
  const direction=forward>=0?1:-1,p=point(b,direction*b.spec.length*.42,0);b.brakingWaves.push({...p,time:b.time,a:b.a+(direction<0?Math.PI:0),initial:b.spec.beam*.5,width:.8+b.spec.beam*.13,speed:Math.min(4.8,2+previous*.12),amplitude:Math.min(.42,(.04+previous*.012+deceleration*.018)*(b.spec.mass/1200)**.25),currentX:current.x,currentY:current.y});b.lastBrakeWave=b.time;b.brakeEpisode=true;
 }
 while(b.brakingWaves.length&&(b.time-b.brakingWaves[0].time>14||b.brakingWaves.length>16))b.brakingWaves.shift();
}
export function sampleBrakingWaves(history,x,y,time){
 const out=empty();for(const q of history??[]){const age=time-q.time;if(age<.12||age>14)continue;const cx=q.x+q.currentX*age,cy=q.y+q.currentY*age,dx=x-cx,dy=y-cy,r=Math.hypot(dx,dy);if(r<.01)continue;
  const radius=q.initial+q.speed*age,z=(r-radius)/q.width;if(Math.abs(z)>4)continue;const nx=dx/r,ny=dy/r,direction=.25+.75*Math.max(0,nx*Math.cos(q.a)+ny*Math.sin(q.a));
  const A=q.amplitude*Math.exp(-age/6)/(1+radius*.10)*direction,g=Math.exp(-.5*z*z),h=A*(1-z*z)*g,slope=A*(z*z*z-3*z)*g/q.width,drift=Math.min(.5,3*(A/q.width)**2*q.speed*g*g);
  out.eta+=h;out.sx+=slope*nx;out.sy+=slope*ny;out.vx+=h*q.speed*nx/q.width;out.vy+=h*q.speed*ny/q.width;out.ax-=slope*q.speed*q.speed*nx/q.width;out.ay-=slope*q.speed*q.speed*ny/q.width;out.driftX+=drift*nx;out.driftY+=drift*ny;
 }return out;
}
export function drawBrakingWaves(ctx,history,time){for(const q of history??[]){const age=time-q.time;if(age<.12||age>14)continue;ctx.save();ctx.translate(q.x+q.currentX*age,q.y+q.currentY*age);ctx.rotate(q.a);for(const trail of[0,1]){ctx.strokeStyle=`rgba(249,255,245,${Math.min(.8,q.amplitude*2.5*Math.exp(-age/6))*(trail?.4:1)})`;ctx.lineWidth=(.10+q.amplitude*.2)*(trail?.7:1);ctx.beginPath();ctx.arc(0,0,Math.max(.1,q.initial+q.speed*age-trail*q.width*.85),-Math.PI*.65,Math.PI*.65);ctx.stroke();}ctx.restore();}}
