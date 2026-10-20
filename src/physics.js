// SI, x east / y south. Heading clockwise from east. Physics reference: docs/PHYSICS.md.
import {clamp,DOCKS,SOLIDS,BOLLARDS,environment,bottomAt,waveAt,reedDensityAt,YBOOMS} from './world.js';
import {groundContact,propellerContact} from './ground.js';
import {createSystems,systemsStep} from './systems.js';
import {createTraffic,trafficStep} from './traffic.js';
import {specification,engineState,updateEngine} from './craft.js';
import {point,cleat,attachRope,solveRopes,createAnchor,updateAnchor,inverseMass,impulse} from './rigging.js';
export {clamp,DOCKS,SOLIDS,BOLLARDS,environment,bottomAt,waveAt,point,cleat,attachRope};
export const MODEL=specification();
export function createBoat(scenario='approach',options={}){
 const spec=specification(options);
 const starts={approach:[43,37,-2.1],berth:[24.3,22,-Math.PI/2],open:[64,48,-Math.PI/2],beach:[8.2,147,Math.PI/2],island:[304,278,Math.PI],fuel:[128,68,-Math.PI/2],canal:[304,204,0],harbor:[143,68,-Math.PI/2]};
 const [x,y,a]=starts[scenario]||starts.approach;
 return{...createSystems(spec,options.coldStart),traffic:createTraffic(),x,y,a,vx:0,vy:0,w:0,steer:0,actualSteer:0,throttle:0,throttle2:0,linked:true,enginesRaised:false,groundLoad:0,groundMaterial:'sand',spec,
 engines:spec.powers.map((hp,i)=>engineState(hp,spec.engineCount===1?0:(i===0?-1:1)*spec.engineSpacing/2,options.coldStart)),
 fenders:true,damage:0,dockDamage:0,ropes:[],anchor:createAnchor(spec),time:0,lastImpact:null,events:[],maxTension:0,
 heave:0,heaveVelocity:0,roll:0,rollVelocity:0,pitch:0,pitchVelocity:0,planing:0,underKeel:bottomAt(x,y).depth-spec.draft,grounded:false,groundEvent:-10,
 telemetry:{surge:0,sway:0,thrust:0,drag:0,shaftPower:0}};
}
export function impactClass(speed,fender=false){const safe=fender?.30:.15,destruction=fender?1.8:1.5;return speed<=safe?'gentle':speed<destruction?'damage':'destruction';}
function event(b,message){b.events.unshift({time:b.time,message});b.events=b.events.slice(0,12);}
function oscillator(state,vel,target,omega,zeta,dt,forcing=0){const acc=omega*omega*(target-state)-2*zeta*omega*vel+forcing;vel+=acc*dt;return[state+vel*dt,vel];}
export function step(b,e,dt){
 b.time+=dt;const S=b.spec,c=Math.cos(b.a),s=Math.sin(b.a);
 const env=environment(b.time,e,b.x,b.y),wave=waveAt(b.x,b.y,b.time,e);
 // Oscillatory orbital flow at draft, with independent restoring heave/roll/pitch.
 const water={x:env.current.x+wave.vx*.65,y:env.current.y+wave.vy*.65};
 [b.heave,b.heaveVelocity]=oscillator(b.heave,b.heaveVelocity,wave.eta-(b.anchor.shape?.V??0)/(1000*9.81*S.length*S.beam*.65),4.2,.65,dt);
 const windSide=-env.wind.x*s+env.wind.y*c;
 const rollTarget=clamp(Math.atan(-wave.sx*s+wave.sy*c)+windSide*Math.abs(windSide)*S.freeboard/(S.mass*.9)-b.planing*Math.atan((b.telemetry.surge??0)*b.w/9.81)*.6,-.3,.3);
 [b.roll,b.rollVelocity]=oscillator(b.roll,b.rollVelocity,rollTarget,Math.sqrt(9.81/(S.beam*.32)),.28,dt);
 const ur=(b.vx-env.current.x)*c+(b.vy-env.current.y)*s;
 const vr=-(b.vx-env.current.x)*s+(b.vy-env.current.y)*c;
 const u=(b.vx-water.x)*c+(b.vy-water.y)*s;
 const v=-(b.vx-water.x)*s+(b.vy-water.y)*c;
 let X=0,Y=0,N=0;
 const force=(x,y,px=0,py=0)=>{X+=x;Y+=y;N+=px*y-py*x;};
 const fn=Math.abs(u)/Math.sqrt(9.81*S.length);
 const meanTrim=S.jet?.28:b.engines.reduce((sum,en)=>sum+en.trim,0)/b.engines.length;
 const trimAngle=(-4+22*meanTrim)*Math.PI/180;
 const liftRatio=.5*1000*u*u*S.length*S.beam*.23*Math.max(.025,.09-S.deadrise*.0012)/Math.max(1,S.mass*9.81);
 const targetPlaning=S.planing&&u>0?clamp((fn-.48)/.4,0,1)*clamp(liftRatio/.65,0,1):0;
 b.planing+=(targetPlaning-b.planing)*(1-Math.exp(-dt/(targetPlaning>b.planing?2.8:1.4)));
 const hump=Math.exp(-(((fn-.55)/.24)**2))*(1-.65*b.planing);
 const pitchTarget=clamp(Math.atan(wave.sx*c+wave.sy*s)+hump*.085+(b.planing*(.045+trimAngle*.42))+(b.telemetry.acceleration??0)*.014-S.cgX/S.length*.3-(b.anchor.shape?.V??0)/(S.mass*9.81)*.5,-.12,.24);
 [b.pitch,b.pitchVelocity]=oscillator(b.pitch,b.pitchVelocity,pitchTarget,Math.sqrt(9.81/(S.length*.14)),.65,dt);
 // ITTC-inspired friction + approximate wave-making hump and planing support drag.
 const re=Math.max(1e5,Math.abs(u)*S.length/1e-6),cf=.075/(Math.log10(re)-2)**2;
 const lowTrim=S.jet?0:clamp((.42-meanTrim)/.42,0,1);
 const wet=S.length*(S.beam*.75+S.draft*1.7)*(1-.65*b.planing)*(1+.30*lowTrim*b.planing);
 const friction=.5*1000*wet*(cf+.0015)*u*Math.abs(u);
 const waveDrag=S.mass*9.81*(S.planing?.055:.085)*Math.exp(-(((fn-.43)/.15)**2))*(1-.8*b.planing);
 const support=S.mass*9.81*(.032+.025*lowTrim+.00022*u*u+.30*(trimAngle-.08)**2)*b.planing;
 const displacementLimit=S.planing?0:S.mass*9.81*.085*Math.max(0,fn-.42)**2*12;
 const transom=u<0?(.5*1000*S.beam*S.draft*.75*u*u):0;
 const turnDrag=.5*1000*S.draft*S.length*1.8*(v*v+(b.w*S.length)**2);
 const drag=friction+Math.sign(u)*turnDrag+Math.sign(u)*(waveDrag+support+displacementLimit+transom);
 force(-drag-S.mass*.009*u,0);
 // Strip-theory cross-flow + speed-dependent lift. All local forces oppose local motion.
 const strips=9,dx=S.length/strips;
 for(let i=0;i<strips;i++){
  const x=-S.length*.5+(i+.5)*dx,local=v+b.w*x;
  const shape=.65+.35*Math.cos(x/S.length*Math.PI);
  const cfDrag=.5*1000*S.draft*1.05*dx*shape*(1-.32*b.planing)*Math.abs(local)*local;
  const lift=.5*1000*S.draft*dx*.9*Math.abs(u)*local;
  const linear=S.mass*.028/strips*local;
  force(0,-cfDrag-lift-linear,x-S.length*.10*clamp(u/3,0,1),0);
 }
 // Outboards rotate at a finite rate; linked controls copy commands, not engine states.
 b.actualSteer+=clamp(b.steer-b.actualSteer,-.38*dt,.38*dt);
 if(b.linked)b.throttle2=b.throttle;
 let totalThrust=0;
 b.engines.forEach((engine,i)=>{
  const x=S.engineLever,y=engine.y,delta=b.actualSteer;
  const inflow=(u-b.w*y)*Math.cos(delta)-(v+b.w*x)*Math.sin(delta);
  propellerContact(b,engine,dt,m=>event(b,m));
  let thrust=updateEngine(engine,i===0?b.throttle:b.throttle2,inflow,dt,b.damage,{noFuel:b.fuel.litres<=0,jet:S.jet});
  if(b.enginesRaised){thrust=0;engine.thrust=0;}
  thrust*=S.jet?1:Math.cos((-4+22*engine.trim)*Math.PI/180);
  force(thrust*Math.cos(delta),-thrust*Math.sin(delta),x,y);totalThrust+=thrust;
  // Submerged skeg: flow creates steering even in neutral; stalls at large incidence.
  const lateral=(u-b.w*y)*Math.sin(delta)+(v+b.w*x)*Math.cos(delta);
  const axial=(u-b.w*y)*Math.cos(delta)-(v+b.w*x)*Math.sin(delta);
  const skeg=(b.enginesRaised||S.jet?0:1)*-.5*1000*(.022+engine.hp*.00012)*1.1*Math.hypot(axial,lateral)*lateral;
  force(skeg*Math.sin(delta),skeg*Math.cos(delta),x,y);
 });
 systemsStep(b,dt);
 force(0,b.thrusters.bowForce,S.length*.38,0);force(0,b.thrusters.sternForce,-S.length*.38,0);
 const reeds=reedDensityAt(b.x,b.y);b.reeds=reeds;
 force(-S.mass*.35*reeds*u*Math.abs(u),-S.mass*.6*reeds*v*Math.abs(v));
 const ax=env.wind.x-b.vx,ay=env.wind.y-b.vy,au=ax*c+ay*s,av=-ax*s+ay*c;
 force(.5*1.225*.85*S.beam*S.freeboard*au*Math.abs(au),.5*1.225*1.05*S.length*S.freeboard*av*Math.abs(av),S.length*.06,0);
 force(S.mass*.12*(wave.ax*c+wave.ay*s),S.mass*.25*(-wave.ax*s+wave.ay*c));
 // Body-axis added-mass model with an empirical correction of the yaw moment.
 const udot=(X+S.my*vr*b.w)/S.mx;
 const vdot=(Y-S.mx*ur*b.w)/S.my;
 // Empirical hull stability cancels the bare potential-flow Munk moment.
 // Leaving it uncalibrated amplifies sideslip into a spin at planing speed.
 const rdot=N/S.iz;
 // Convert body acceleration to world acceleration without double-counting frame rotation.
 const du=udot-b.w*vr,dv=vdot+b.w*ur;
 b.vx+=(c*du-s*dv)*dt;b.vy+=(s*du+c*dv)*dt;b.w+=rdot*dt;
 solveRopes(b,dt,m=>event(b,m));updateAnchor(b,e,dt,m=>event(b,m));
 groundContact(b,wave,dt,m=>event(b,m));
 b.x+=b.vx*dt;b.y+=b.vy*dt;b.a+=b.w*dt;
 contacts(b,dt);trafficStep(b,e,dt);
 if(b.damage>=100){b.throttle=0;b.throttle2=0;}
 b.telemetry={surge:ur,sway:vr,thrust:totalThrust,drag:Math.abs(drag),acceleration:udot,shaftPower:b.engines.reduce((sum,en)=>sum+en.hp*735.5*en.n**3,0)};
}
const boomRects=YBOOMS.flatMap(q=>{const n=Math.ceil(Math.hypot(q.x2-q.x1,q.y2-q.y1)/.45);return Array.from({length:n+1},(_,i)=>({x:q.x1+(q.x2-q.x1)*i/n-q.width/2,y:q.y1+(q.y2-q.y1)*i/n-q.width/2,w:q.width,h:q.width}));});
const CONTACTS=[...SOLIDS,...boomRects];
function contacts(b,dt){
 const S=b.spec,radius=S.beam*.48,offset=S.length*.5-radius;
 const count=Math.max(3,Math.ceil(2*offset/(radius*1.4))+1);
 for(let iteration=0;iteration<3;iteration++)for(let i=0;i<count;i++){
  const q=-offset+2*offset*i/(count-1),p=point(b,q,0);
  for(let k=0;k<CONTACTS.length;k++){
   const rect=CONTACTS[k],near={x:clamp(p.x,rect.x,rect.x+rect.w),y:clamp(p.y,rect.y,rect.y+rect.h)};
   const dx=p.x-near.x,dy=p.y-near.y,d=Math.hypot(dx,dy);let depth=radius-d;
   if(depth<=0)continue;let nx,ny;
   if(d<1e-8){const sides=[{v:p.x-rect.x,x:-1,y:0},{v:rect.x+rect.w-p.x,x:1,y:0},{v:p.y-rect.y,x:0,y:-1},{v:rect.y+rect.h-p.y,x:0,y:1}].sort((a,b)=>a.v-b.v);nx=sides[0].x;ny=sides[0].y;depth=radius+sides[0].v;}else{nx=dx/d;ny=dy/d;}
   const arm={x:q*Math.cos(b.a)-nx*radius,y:q*Math.sin(b.a)-ny*radius},n={x:nx,y:ny};
   const vn=(b.vx-b.w*arm.y)*nx+(b.vy+b.w*arm.x)*ny,effective=1/inverseMass(b,n,arm);
   const sideContact=Math.abs(-nx*Math.sin(b.a)+ny*Math.cos(b.a))>.65;
   const dockContact=k<DOCKS.length||k>=SOLIDS.length;
   const protectedContact=b.fenders&&sideContact&&dockContact;
   if(vn<0){
    const speed=-vn;impulse(b,n,-1.015*vn*effective,arm);
    // Wave-scale rubbing is not a fresh damaging impact every frame.
    if(speed>.08&&(!b.lastImpact||b.time-b.lastImpact.time>.65)){
     const kind=impactClass(speed,protectedContact),energy=.5*effective*speed*speed,absorbed=protectedContact?40:10;
     const damage=kind==='gentle'?0:kind==='destruction'?100:Math.min(75,Math.max(1,(energy-absorbed)/9));
     b.damage=clamp(b.damage+damage,0,100);if(dockContact)b.dockDamage=clamp(b.dockDamage+(kind==='destruction'?100:Math.max(0,(energy-80)/18)),0,100);
     b.lastImpact={time:b.time,speed,energy,kind,protectedContact};event(b,`${kind==='gentle'?'Łagodny kontakt':kind==='damage'?'Uszkodzenie':'Silna kolizja'}: ${speed.toFixed(2)} m/s · ${Math.round(energy)} J${protectedContact?' · odbijacze':''}`);
    }
   }
   b.x+=nx*depth*.8;b.y+=ny*depth*.8;
  }
 }
}
