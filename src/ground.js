import {bottomAt,bottomGradient,clamp} from './world.js';
import {driveGeometry} from './drive.js';
import {point,impulse,inverseMass} from './rigging.js';
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
   engine.propDamage=clamp(engine.propDamage+abrasive*(.10+2.8*rotating*rotating)*clamp(penetration/.2,0,2)*(speed+.7*rotating)*dt,0,100);
   if(!engine.propContact&&(speed>.04||rotating>.1))notify(`${b.spec.jet?'Wirnik':'Śruba'} dotyka ${floor.material==='sand'?'piasku':'mułu'} — ogranicz obroty${b.spec.jet?' i opuść płyciznę.':' lub podnieś napęd.'}`);
  }
 }
 engine.propContact=touching;
 if(previous<100&&engine.propDamage>=100)notify('Śruba zniszczona — ten silnik nie przekazuje ciągu.');
}
export function groundContact(b,wave,dt,notify){
 const S=b.spec,samples=[];let clearance=Infinity,support=-Infinity,maxPenetration=0,material='sand';
 // Broad hull sampling: asymmetric bottom contacts can turn the hull while beaching.
 for(const x of [-.4*S.length,-.2*S.length,0,.2*S.length,.4*S.length])for(const y of [-.32*S.beam,0,.32*S.beam]){
  const p=point(b,x,y),floor=bottomAt(p.x,p.y),rise=.10*(Math.abs(x)/(.4*S.length))**2+.08*(Math.abs(y)/(.32*S.beam))**2;
  const hullDraft=S.draft-rise-x*Math.sin(b.pitch)-y*Math.sin(b.roll);
  const restPenetration=Math.max(0,hullDraft-Math.min(wave.eta,b.heave)-floor.depth),actual=floor.depth+b.heave-hullDraft;
  clearance=Math.min(clearance,actual);support=Math.max(support,hullDraft-floor.depth);
  if(restPenetration>maxPenetration){maxPenetration=restPenetration;material=floor.material;}
  if(restPenetration>0)samples.push({p,floor,penetration:restPenetration});
 }
 b.underKeel=clearance;b.grounded=maxPenetration>.003;b.groundMaterial=material;
 b.groundLoad=0;
 if(!b.grounded)return;
 // Seabed replaces lost hydrostatic support; the boat rides up rather than sinking through sand.
 b.heave=Math.max(b.heave,support);b.underKeel=Math.max(0,clearance);if(b.heave<=support+.001)b.heaveVelocity=Math.max(0,b.heaveVelocity);
 for(const q of samples){
  const load=S.mass*9.81/15*clamp(q.penetration/(S.draft*.7),0,1),arm={x:q.p.x-b.x,y:q.p.y-b.y};b.groundLoad+=load;
  const gradient=bottomGradient(q.p.x,q.p.y),slope=Math.hypot(gradient.x,gradient.y);
  if(slope>.0001){const n={x:gradient.x/slope,y:gradient.y/slope};impulse(b,n,Math.min(slope,.8)*load*dt,arm);}
  const vx=b.vx-b.w*arm.y,vy=b.vy+b.w*arm.x,speed=Math.hypot(vx,vy);
  if(speed>.000001){
   const n={x:-vx/speed,y:-vy/speed},mu={sand:.45,mud:.65,rock:.65}[q.floor.material];
   const resistance=load*(mu+Math.min(1.5,speed*.2));
   impulse(b,n,Math.min(speed/inverseMass(b,n,arm),resistance*dt),arm);
  }
 }
 const speed=Math.hypot(b.vx,b.vy);
 if(speed>.18&&b.time-b.groundEvent>1){
  const roughness=material==='rock'?8:material==='sand'?.15:.06;
  const damage=roughness*speed*speed*clamp(maxPenetration/.15,0,2);
  b.damage=clamp(b.damage+damage,0,100);b.groundEvent=b.time;
  notify(`${material==='rock'?'Kadłub uderza w kamienie':'Kadłub osiada na '+(material==='sand'?'piasku':'mule')} · obciążenie dna ${Math.round(b.groundLoad/9.81)} kg.`);
 }
}
