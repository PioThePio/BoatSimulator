// Metres, seconds, kilograms; x east, y south; heading clockwise from east.
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const cross=(a,b)=>a.x*b.y-a.y*b.x;
export const length=v=>Math.hypot(v.x,v.y);
export const MODEL={mass:900,inertia:2600,length:5.5,beam:2.1,maxThrust:2400,reverseThrust:1300,maxSteer:35*Math.PI/180};
export const DOCKS=[{x:6,y:10,w:23,h:2.8},{x:17,y:12.8,w:2.8,h:17},{x:29,y:10,w:2.8,h:16}];
export const SOLIDS=[...DOCKS,{x:-8,y:-8,w:108,h:12},{x:-8,y:4,w:12,h:64},{x:4,y:56,w:96,h:12},{x:88,y:4,w:12,h:52}];
export const BOLLARDS=[{x:12,y:12.8},{x:17,y:18},{x:17,y:25},{x:19.8,y:28},{x:29,y:17},{x:29,y:23},{x:25,y:12.8}];
export function point(b,x,y){const c=Math.cos(b.a),s=Math.sin(b.a);return{x:b.x+c*x-s*y,y:b.y+s*x+c*y};}
export function cleat(b,end){return point(b,end==='bow'?2.05:-2.05,0);}
export function createBoat(scenario='approach'){
 const starts={approach:[43,37,-2.1],berth:[24.2,22,-Math.PI/2],open:[60,35,-Math.PI/2]};
 const [x,y,a]=starts[scenario]||starts.approach;
 return {x,y,a,vx:0,vy:0,w:0,steer:0,throttle:0,fenders:true,damage:0,dockDamage:0,ropes:[],time:0,lastImpact:null,events:[],maxTension:0};
}
export function environment(t,e){const phase=e.gusts?1+0.28*Math.sin(t*.37)+.12*Math.sin(t*1.13):1;const a=e.windDirection*Math.PI/180;const c=e.currentDirection*Math.PI/180;return {wind:{x:Math.sin(a)*e.windSpeed*phase,y:-Math.cos(a)*e.windSpeed*phase},current:{x:Math.sin(c)*e.currentSpeed,y:-Math.cos(c)*e.currentSpeed}};}
export function attachRope(b,end){const p=cleat(b,end);let best=null,d=Infinity;BOLLARDS.forEach((q,i)=>{const v=Math.hypot(p.x-q.x,p.y-q.y);if(v<d){d=v;best=i;}});if(d>6)return {ok:false,message:'Podejdź bliżej polera — maksymalny zasięg rzutu to 6 m.'};if(b.ropes.some(r=>r.end===end))return{ok:false,message:'Ta knaga ma już cumę. Najpierw ją odczep.'};b.ropes.push({end,bollard:best,length:d+.35,tension:0});return{ok:true,message:`Założono cumę ${end==='bow'?'dziobową':'rufową'}.`};}
// Energy budgets are teaching assumptions, not certified damage/safety limits.
export function impactClass(speed,fender=false){const safe=fender ? .30 : .15, destruction=fender ? 1.8 : 1.5;return speed<=safe?'gentle':speed<destruction?'damage':'destruction';}
function event(b,message){b.events.unshift({time:b.time,message});b.events=b.events.slice(0,8);}
export function step(b,e,dt){
 b.time+=dt;
 const env=environment(b.time,e), c=Math.cos(b.a),s=Math.sin(b.a);
 let fx=0,fy=0,torque=0;
 const force=(x,y,px=0,py=0)=>{fx+=x;fy+=y;torque+=px*y-py*x;};
 // Distributed transverse water drag produces yaw damping and longitudinal/lateral asymmetry.
 for(const q of [-2,-1,0,1,2]){
  const rx=c*q,ry=s*q;const vx=b.vx-b.w*ry-env.current.x,vy=b.vy+b.w*rx-env.current.y;
  const u=vx*c+vy*s,v=-vx*s+vy*c;
  const fu=-(28*u+22*Math.abs(u)*u)/5,fv=-(330*v+480*Math.abs(v)*v)/5;
  force(c*fu-s*fv,s*fu+c*fv,rx,ry);
 }
 // Aerodynamic drag relative to air at a forward centre of pressure.
 const ax=env.wind.x-b.vx,ay=env.wind.y-b.vy;
 const au=ax*c+ay*s,av=-ax*s+ay*c;
 const wu=.5*1.225*.85*2.1*Math.abs(au)*au,wv=.5*1.225*1.05*6*Math.abs(av)*av;
 force(c*wu-s*wv,s*wu+c*wv,.35*c,.35*s);
 // Positive wheel turns right: jet thrust at stern points to port.
 const thrust=b.throttle*(b.throttle>=0?MODEL.maxThrust:MODEL.reverseThrust)*(1-b.damage/100);
 force(thrust*Math.cos(b.a-b.steer),thrust*Math.sin(b.a-b.steer),-2.4*c,-2.4*s);
 b.maxTension=0;
 b.ropes=b.ropes.filter(r=>{
  const p=cleat(b,r.end),q=BOLLARDS[r.bollard],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);
  const rx=p.x-b.x,ry=p.y-b.y;
  const speed=d>0?((b.vx-b.w*ry)*dx+(b.vy+b.w*rx)*dy)/d:0;
  r.tension=d>r.length?Math.max(0,4200*(d-r.length)-1200*speed):0;
  if(r.tension>6500){event(b,'Cuma pękła: przekroczono 6,5 kN.');return false;}
  if(d>0)force(r.tension*dx/d,r.tension*dy/d,rx,ry);
  b.maxTension=Math.max(b.maxTension,r.tension);return true;
 });
 b.vx+=fx/MODEL.mass*dt;b.vy+=fy/MODEL.mass*dt;b.w+=torque/MODEL.inertia*dt;
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
 // Three overlapping hull circles; sequential impulse contacts include angular velocity.
 for(let iteration=0;iteration<3;iteration++)for(const q of [-1.65,0,1.65]){
  const p=point(b,q,0);const radius=q===0?1.05:.95;
  for(let k=0;k<SOLIDS.length;k++){
   const rect=SOLIDS[k];const near={x:clamp(p.x,rect.x,rect.x+rect.w),y:clamp(p.y,rect.y,rect.y+rect.h)};
   let dx=p.x-near.x,dy=p.y-near.y,d=Math.hypot(dx,dy),depth=radius-d;
   if(depth<=0)continue;
   let nx,ny;
   if(d<1e-8){const sides=[{v:p.x-rect.x,x:-1,y:0},{v:rect.x+rect.w-p.x,x:1,y:0},{v:p.y-rect.y,x:0,y:-1},{v:rect.y+rect.h-p.y,x:0,y:1}].sort((a,b)=>a.v-b.v);nx=sides[0].x;ny=sides[0].y;depth=radius+sides[0].v;}else{nx=dx/d;ny=dy/d;}
   const rx=q*Math.cos(b.a)-nx*radius,ry=q*Math.sin(b.a)-ny*radius;
   const vn=(b.vx-b.w*ry)*nx+(b.vy+b.w*rx)*ny;
   const lever=rx*ny-ry*nx, effective=1/(1/MODEL.mass+lever*lever/MODEL.inertia);
   const sideContact=Math.abs(nx*(-Math.sin(b.a))+ny*Math.cos(b.a))>.65;
   const protectedContact=b.fenders&&sideContact&&k<DOCKS.length;
   if(vn<0){
    const speed=-vn,j=-(1.04)*vn*effective;b.vx+=j*nx/MODEL.mass;b.vy+=j*ny/MODEL.mass;b.w+=j*lever/MODEL.inertia;
    const kind=impactClass(speed,protectedContact);
    if(speed>.08&&(!b.lastImpact||b.time-b.lastImpact.time>.65)){
     const energy=.5*effective*speed*speed,absorbed=protectedContact?40:10;
     const damage=kind==='gentle'?0:kind==='destruction'?100:Math.min(75,Math.max(1,(energy-absorbed)/9));
     b.damage=clamp(b.damage+damage,0,100);
     if(k<DOCKS.length)b.dockDamage=clamp(b.dockDamage+(kind==='destruction'?100:Math.max(0,(energy-80)/18)),0,100);
     b.lastImpact={time:b.time,speed,energy,kind,protectedContact};
     event(b,`${kind==='gentle'?'Łagodny kontakt':kind==='damage'?'Uszkodzenie':'Silna kolizja'}: ${speed.toFixed(2)} m/s · ${Math.round(energy)} J${protectedContact?' · odbijacze':''}`);
    }
   }
   b.x+=nx*depth*.85;b.y+=ny*depth*.85;
  }
 }
 if(b.damage>=100)b.throttle=0;
}
