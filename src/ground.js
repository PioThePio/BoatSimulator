import {bottomAt,bottomGradient,clamp} from './world.js';
import {driveGeometry} from './drive.js';
import {point,impulse,inverseMass} from './rigging.js';
import {recordImpact,bottomZone} from './impacts.js';
export function propellerPoint(b,engine){const g=driveGeometry(b,engine);return{x:g.x,y:g.y};}
export function propellerContact(b,engine,dt,notify,env={}){
 const g=driveGeometry(b,engine,env),p=g,floor=g.floor,clearance=g.clearance;
 engine.propClearance=clearance;engine.immersion=g.immersed;engine.intake=g.intake;engine.propDepth=g.propDepth;engine.drive=g;
 const penetration=Math.max(0,-clearance),touching=penetration>0&&!b.enginesRaised;
 const speed=Math.hypot(b.vx-b.w*(p.y-b.y),b.vy+b.w*(p.x-b.x));
 const rotating=engine.gear!==0?engine.n:0,previous=engine.propDamage;
 if(touching){
  if(floor.material==='rock'){
   if((!engine.propContact||b.time-engine.lastStrike>.45)&&(speed>.04||rotating>.1)){
    const severity=clamp(3+penetration*80+speed*speed*4+rotating*rotating*38,0,85);
    engine.propDamage=clamp(engine.propDamage+severity,0,100);engine.lastStrike=b.time;
    notify(`${b.spec.jet?'Wirnik':'Śruba'}: uderzenie o kamienie · uszkodzenia ${Math.round(engine.propDamage)}%.`);
   }
  }else{
   const abrasive=floor.material==='sand'?1:.25;
   if(!engine.propContact&&b.time-engine.lastStrike>1&&(speed>.04||rotating>.1)){
    engine.propDamage=clamp(engine.propDamage+abrasive*(.12+Math.min(.38,penetration+rotating*.2)),0,100);engine.lastStrike=b.time;
   }
   engine.propDamage=clamp(engine.propDamage+abrasive*(.10+2.8*rotating*rotating)*clamp(penetration/.2,0,2)*(speed+.7*rotating)*dt,0,100);
   if(!engine.propContact&&(speed>.04||rotating>.1))notify(`${b.spec.jet?'Wirnik':'Śruba'} dotyka ${floor.material==='sand'?'piasku':'mułu'} — ogranicz obroty${b.spec.jet?' i opuść płyciznę.':' lub podnieś napęd.'}`);
  }
 }
 engine.propContact=touching;
 if(previous<100&&engine.propDamage>=100)notify('Śruba zniszczona — ten silnik nie przekazuje ciągu.');
}
export function groundContact(b,wave,dt,notify){
 const S=b.spec,samples=[],wasGrounded=b.grounded,entrySpeed=Math.hypot(b.vx,b.vy);let clearance=Infinity,support=-Infinity,maxPenetration=0,material='sand';
 // Broad hull sampling: asymmetric bottom contacts can turn the hull while beaching.
 for(const x of [-.4*S.length,-.2*S.length,0,.2*S.length,.4*S.length])for(const y of [-.32*S.beam,0,.32*S.beam]){
  const p=point(b,x,y),floor=bottomAt(p.x,p.y),rise=.10*(Math.abs(x)/(.4*S.length))**2+.08*(Math.abs(y)/(.32*S.beam))**2;
  const hullDraft=S.draft-rise-x*Math.sin(b.pitch)-y*Math.sin(b.roll);
  const restPenetration=Math.max(0,hullDraft-(b.launchMotion?b.heave:Math.min(wave.eta,b.heave))-floor.depth),actual=floor.depth+b.heave-hullDraft;
  clearance=Math.min(clearance,actual);support=Math.max(support,hullDraft-floor.depth);
  if(restPenetration>maxPenetration){maxPenetration=restPenetration;material=floor.material;}
  if(restPenetration>0){
   const gradient=bottomGradient(p.x,p.y),arm={x:p.x-b.x,y:p.y-b.y};
   const vertical=b.heaveVelocity+x*Math.cos(b.pitch)*b.pitchVelocity+y*Math.cos(b.roll)*b.rollVelocity;
   const closing=Math.max(0,-(vertical+gradient.x*(b.vx-b.w*arm.y)+gradient.y*(b.vy+b.w*arm.x))/Math.hypot(1,gradient.x,gradient.y));
   samples.push({p,floor,penetration:restPenetration,closing,gradient,arm});
  }
 }
 b.underKeel=clearance;b.grounded=maxPenetration>(b.launchMotion?.0001:.003);b.groundMaterial=material;
 b.groundLoad=0;
 if(!b.grounded)return;
 // Seabed replaces lost hydrostatic support; the boat rides up rather than sinking through sand.
 b.heave=Math.max(b.heave,support);b.underKeel=Math.max(0,clearance);if(b.heave<=support+.001)b.heaveVelocity=Math.max(0,b.heaveVelocity);
 for(const q of samples){
  const load=b.launchMotion?S.mass*9.81*clamp(1-(b.wetFraction??0),.05,1)/samples.length:S.mass*9.81/15*clamp(q.penetration/(S.draft*.7),0,1),arm={x:q.p.x-b.x,y:q.p.y-b.y};b.groundLoad+=load;
  const gradient=q.gradient,slope=Math.hypot(gradient.x,gradient.y);
  if(slope>.0001){const n={x:gradient.x/slope,y:gradient.y/slope};impulse(b,n,Math.min(slope,.8)*load*dt,arm);}
  const vx=b.vx-b.w*arm.y,vy=b.vy+b.w*arm.x,speed=Math.hypot(vx,vy);
  if(speed>.000001){
   const n={x:-vx/speed,y:-vy/speed},mu={sand:.45,mud:.65,rock:.65}[q.floor.material];
   const resistance=load*(mu+Math.min(1.5,speed*.2));
   impulse(b,n,Math.min(speed/inverseMass(b,n,arm),resistance*dt),arm);
  }
 }
 const speed=entrySpeed,closing=Math.max(0,...samples.map(q=>q.closing));
 if((speed>.04||closing>.025)&&b.time-b.groundEvent>1){
  const total=samples.reduce((sum,q)=>sum+q.penetration,0),groups=new Map();let damage=0;
  // Contact points, rather than a bow/burta guess, locate damage to the floor.
  // A slow soft-bottom landing is support, not a hull-damage event.
  for(const q of samples){const zone=bottomZone(b,q.arm),group=groups.get(zone)??{sample:q,weight:0,closing:0};group.weight+=q.penetration/total;group.closing=Math.max(group.closing,q.closing);if(q.penetration>group.sample.penetration)group.sample=q;groups.set(zone,group);}
  for(const group of groups.values()){
   const q=group.sample,rock=q.floor.material==='rock',sand=q.floor.material==='sand';
   const horizontal=Math.max(0,speed-(rock?.18:sand?1.25:1.6)),normal=Math.max(0,group.closing-(rock?.08:.5));
   const loss=((rock?8:sand?.15:.06)*horizontal**2+(rock?12:2)*normal**2)*clamp(q.penetration/.15,0,2)*group.weight;
   recordImpact(b,{arm:q.arm,speed:Math.max(speed,group.closing),effective:S.mass*group.weight,target:'bottom',dock:false,damage:loss});damage+=loss;
  }
  b.groundEvent=b.time;
  if(!wasGrounded||damage>0)notify(`${material==='rock'?'Kontakt dna kadłuba z kamieniami':'Kadłub osiada na '+(material==='sand'?'piasku':'mule')}${damage===0?' · bez uszkodzeń':''} · obciążenie dna ${Math.round(b.groundLoad/9.81)} kg.`);
 }
}
