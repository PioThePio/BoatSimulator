import {clamp,bottomAt,waveAt,BOLLARDS} from './world.js';
import {bodyPoint,bodyLocal,bunkZ,kick} from './tow-geometry.js';
import {impulse,inverseMass} from './rigging.js';
import {recordImpact} from './impacts.js';

export function nearTrailer(r,b){const p=bodyLocal(r.trailer,b);return Math.abs(p.x-r.trailer.offset)<b.spec.length*.95&&Math.abs(p.y)<r.trailer.beam*.8;}
function contacts(r,b){
 const S=b.spec,t=r.trailer,samples=[];
 for(const [name,x,weight]of [['stern',-.34*S.length,.32],['mid',0,.36],['bow',.34*S.length,.32]]){
  const world=bodyPoint(b,x),p=bodyLocal(t,world),keel=b.heave+x*Math.sin(b.pitch)-S.draft;
  const inside=p.x>t.offset-S.length*.53&&p.x<t.offset+S.length*.47&&Math.abs(p.y)<t.beam*.47;
  samples.push({name,x,weight,world,p,keel,bed:bunkZ(t,p.x),inside});
 }return samples;
}
export function lockedSupport(r,b){
 const samples=contacts(r,b);let load=0;
 for(const q of samples){q.buoyancy=clamp(-q.keel/b.spec.draft,0,1);q.load=b.spec.mass*9.81*q.weight*(1-q.buoyancy);load+=q.load;}
 return b.trailerSupport={samples,load,kg:load/9.81,near:true,sternFloat:samples[0].buoyancy,bowFloat:samples[2].buoyancy};
}
export function launchVerticalStep(r,b,e,dt){
 const near=nearTrailer(r,b);if(!near&&!b.launchMotion)return false;
 b.launchMotion=true;const S=b.spec,samples=contacts(r,b);let up=-S.mass*9.81,moment=0,rollMoment=0,load=0,wet=0;
 const iz=S.mass*S.length*S.length*.085,ir=S.mass*(S.beam*S.beam+S.freeboard*S.freeboard)*.10;
 for(const q of samples){
  const surface=waveAt(q.world.x,q.world.y,b.time,e).eta,buoyancy=clamp((surface-q.keel)/S.draft,0,1.55);
  wet+=q.weight*clamp(buoyancy,0,1);q.buoyancy=clamp(buoyancy,0,1);
  const vertical=b.heaveVelocity+q.x*Math.cos(b.pitch)*b.pitchVelocity;
  const float=S.mass*9.81*q.weight*buoyancy-S.mass*q.weight*3.4*vertical*clamp(buoyancy,0,1);
  up+=float;moment+=q.x*float;
  const targetV=(r.trailer.vx*Math.cos(r.trailer.a)+r.trailer.vy*Math.sin(r.trailer.a))*Math.sin(r.trailer.pitch);
  q.load=0;q.shoes=[];q.inside=false;
  for(const side of [-1,1]){
   const world=bodyPoint(r.trailer,q.p.x,side*S.beam*.27),local=bodyLocal(b,world),p=bodyLocal(r.trailer,world);
   const inside=Math.abs(local.x)<S.length*.48&&Math.abs(local.y)<S.beam*(local.x>S.length*.3?.37:.48)&&p.x>r.trailer.offset-S.length*.53&&p.x<r.trailer.offset+S.length*.47;
   const keel=b.heave+local.x*Math.sin(b.pitch)+local.y*Math.sin(b.roll)-S.draft,bed=bunkZ(r.trailer,p.x),penetration=inside?bed-keel:0;
   const weight=q.weight*.5,stiffness=S.mass*9.81*weight/.025,damping=1.1*Math.sqrt(stiffness*S.mass*weight),v=b.heaveVelocity+local.x*Math.cos(b.pitch)*b.pitchVelocity+local.y*Math.cos(b.roll)*b.rollVelocity;
   const force=penetration>0?clamp((stiffness*penetration-damping*(v-targetV))/(1+stiffness*dt*dt/(S.mass*weight)),0,S.mass*9.81):0;
   q.shoes.push({world:bodyPoint(b,local.x,local.y),p,load:force,inside,bed});q.inside||=inside;q.load+=force;up+=force;moment+=local.x*force;rollMoment+=local.y*force;load+=force;
  }
 }
 b.heaveVelocity+=up/S.mass*dt;b.heave+=b.heaveVelocity*dt;
 b.pitchVelocity+=(moment/iz-b.pitchVelocity*1.3)*dt;b.pitch=clamp(b.pitch+b.pitchVelocity*dt,-.65,.65);
 rollMoment-=S.mass*9.81*S.beam*.35*Math.sin(b.roll)*wet;
 b.rollVelocity+=(rollMoment/ir-b.rollVelocity*(.4+2*wet))*dt;b.roll=clamp(b.roll+b.rollVelocity*dt,-.8,.8);
 b.wetFraction=wet;b.trailerSupport={samples,load,kg:load/9.81,near,sternFloat:samples[0].buoyancy,bowFloat:samples[2].buoyancy};
 if(!near&&wet>.98&&Math.abs(b.heave)<.08&&Math.abs(b.heaveVelocity)<.1){b.launchMotion=false;b.wetFraction=1;}
 return true;
}
function boatHit(b,message){b.events.unshift({time:b.time,message});b.events.length=Math.min(b.events.length,12);}
function contactImpulse(r,b,q,n,penetration,dt,{target='trailer-guide',protectedContact=false,damage}={}){
 const receiver=q.body,p=q.world,arm={x:p.x-b.x,y:p.y-b.y},rx=p.x-receiver.x,ry=p.y-receiver.y,lever=rx*n.y-ry*n.x;
 const bv={x:b.vx-b.w*arm.y,y:b.vy+b.w*arm.x},v=(bv.x-q.vx)*n.x+(bv.y-q.vy)*n.y;
 const actor=r.secured?r.trailer:null,actorArm=actor?{x:p.x-actor.x,y:p.y-actor.y}:null,actorLever=actorArm?actorArm.x*n.y-actorArm.y*n.x:0;
 const inv=(actor?1/actor.mass+actorLever*actorLever/actor.iz:inverseMass(b,n,arm))+1/receiver.mass+lever*lever/receiver.iz;
 if(!r.secured){b.x+=n.x*penetration*.28;b.y+=n.y*penetration*.28;}
 if(v<0){const j=-v/inv;if(actor)kick(actor,n.x*j,n.y*j,actorArm.x,actorArm.y);else impulse(b,n,j,arm);kick(receiver,-n.x*j,-n.y*j,rx,ry);
  recordImpact(b,{arm,speed:-v,effective:1/inv,protectedContact,target,dock:false,damage},m=>boatHit(b,m));
  if(target==='suv'){r.carDamage=clamp(r.carDamage+Math.max(0,-v-.15)**2*15,0,100);r.status='Kolizja łodzi z SUV-em';}
 }
 return Math.max(0,-v);
}
export function trailerBoatContact(r,b,dt){
 const t=r.trailer,S=b.spec,near=nearTrailer(r,b),support=b.trailerSupport;
 if(!r.secured&&support?.near){
  for(const q of support.samples.flatMap(q=>q.shoes??[q])){if(!q.load)continue;
   const arm={x:q.world.x-b.x,y:q.world.y-b.y},receiver=bodyPoint(t,q.p.x,q.p.y),c=Math.cos(t.a),s=Math.sin(t.a);
   // A normal to the inclined bunk carries weight and lets an unsecured hull
   // slide down the rollers. Both friction directions act through real arms.
   const slope=-q.load*Math.sin(t.pitch)*dt;impulse(b,{x:c,y:s},slope,arm);kick(t,-c*slope,-s*slope,q.world.x-t.x,q.world.y-t.y);
   for(const [nx,ny,mu]of [[c,s,.035],[-s,c,.30]]){
    const n={x:nx,y:ny},v=(b.vx-b.w*arm.y-receiver.vx)*nx+(b.vy+b.w*arm.x-receiver.vy)*ny,lever=(q.world.x-t.x)*ny-(q.world.y-t.y)*nx;
    const inv=inverseMass(b,n,arm)+1/t.mass+lever*lever/t.iz,j=clamp(-v/inv,-mu*q.load*dt,mu*q.load*dt);
    impulse(b,n,j,arm);kick(t,-nx*j,-ny*j,q.world.x-t.x,q.world.y-t.y);
   }
  }
 }
 if(!r.secured&&near){
  for(const bx of [-.32,0,.32]){
   const world=bodyPoint(b,bx*S.length),p=bodyLocal(t,world),radius=S.beam*(bx>0?.30:.43),keel=b.heave+bx*S.length*Math.sin(b.pitch)-S.draft;
   // Chassis rails sit below the bunks. They cannot fence in an unsecured hull
   // resting above them; a submerged/descending hull can still hit the frame.
   if(keel>bunkZ(t,p.x)-.18||p.x<t.offset-S.length*.52||p.x>t.offset+S.length*.43)continue;
   for(const side of [-1,1]){const rail=side*t.beam*.5,pen=radius+.07-Math.abs(p.y-rail);if(pen<=0)continue;const sign=Math.sign(p.y-rail)||-side,n={x:-Math.sin(t.a)*sign,y:Math.cos(t.a)*sign},vel=bodyPoint(t,p.x,p.y);
    contactImpulse(r,b,{body:t,world,vx:vel.vx,vy:vel.vy},n,pen,dt,{protectedContact:true});
   }
  }
  if(!r.postBroken){
   const tip=bodyPoint(b,S.length*.47),p=bodyLocal(t,tip),postX=t.offset+S.length*.46+.2,dx=p.x-postX,dy=p.y,dist=Math.hypot(dx,dy),pen=.18+S.beam*.10-dist;
   if(pen>0&&b.heave+S.length*.47*Math.sin(b.pitch)-S.draft<bunkZ(t,postX)+1.0){const co=Math.cos(t.a),si=Math.sin(t.a),n={x:(dx*co-dy*si)/Math.max(.001,dist),y:(dx*si+dy*co)/Math.max(.001,dist)},vel=bodyPoint(t,postX);
    const speed=contactImpulse(r,b,{body:t,world:tip,vx:vel.vx,vy:vel.vy},n,pen,dt,{target:'trailer-post',damage:Math.max(0,Math.hypot(b.vx-t.vx,b.vy-t.vy)-.2)**2*7});
    if(speed>1.8){r.postBroken=true;r.trailerDamage=clamp(r.trailerDamage+35,0,100);b.ropes=b.ropes.filter(line=>!BOLLARDS[line.bollard]?.trailer);r.status='Wyłamany wspornik dziobowy · ryzyko uderzenia w SUV-a';}
   }
  }
 }
 // Boat/car contact is independent of the coupler and remains active when the
 // SUV reverses into an afloat boat or after the bow stop gives way.
 if(Math.hypot(b.x-r.car.x,b.y-r.car.y)<S.length*.6+4){
  for(const bx of [-.34,0,.34]){const world=bodyPoint(b,bx*S.length),p=bodyLocal(r.car,world),radius=S.beam*(bx>0?.30:.43),nearest={x:clamp(p.x,-2.45,2.45),y:clamp(p.y,-1,1)},dx=p.x-nearest.x,dy=p.y-nearest.y,d=Math.hypot(dx,dy),pen=radius-d;
   const hullZ=b.heave+bx*S.length*Math.sin(b.pitch)-S.draft;if(pen<=0||hullZ>r.car.z+1.6||b.heave+S.freeboard<r.car.z-.45)continue;
   const co=Math.cos(r.car.a),si=Math.sin(r.car.a),nx=d>.001?dx/d:0,ny=d>.001?dy/d:(p.y>=0?1:-1),n={x:nx*co-ny*si,y:nx*si+ny*co},vel=bodyPoint(r.car,nearest.x,nearest.y);
   contactImpulse(r,b,{body:r.car,world,vx:vel.vx,vy:vel.vy},n,pen,dt,{target:'suv'});
  }
 }
 if(!r.secured&&r.boatLoaded){
  const p=bodyLocal(t,b),outside=Math.abs(p.x-t.offset)>S.length*.65||Math.abs(p.y)>t.beam*.7||b.grounded&&Math.abs(b.roll)>.3;
  r.unloadedTime=(support?.load??0)<S.mass*9.81*.015?(r.unloadedTime??0)+dt:0;
  if(outside||r.unloadedTime>.65&&(support?.sternFloat??0)>.95){r.boatLoaded=false;r.status=bottomAt(b.x,b.y).depth>S.draft?'Łódź pływa · cuma PRZ utrzymuje dziób':'Łódź zsunęła się z przyczepy';}
 }
}
