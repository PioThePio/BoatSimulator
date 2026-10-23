import {clamp} from './world.js';
export const ZONES={bow:'Dziób',portBow:'Lewa burta · przód',portMid:'Lewa burta · środek',portStern:'Lewa rufa',transom:'Pawęż',starboardStern:'Prawa rufa',starboardMid:'Prawa burta · środek',starboardBow:'Prawa burta · przód'};
export const BOTTOM_ZONES={bottomBow:'Dno · przód',bottomMid:'Dno · środek',bottomStern:'Dno · tył'};
export function damageColor(damage){return damage<=0?null:damage<10?'#d8c36c':damage<35?'#df9c54':damage<65?'#ce834d':'#bf6350';}
export function bottomZone(b,arm){const x=(arm.x*Math.cos(b.a)+arm.y*Math.sin(b.a))/b.spec.length;return x>.15?'bottomBow':x<-.15?'bottomStern':'bottomMid';}
// Normalised SI positions shared by collision detection, map and instrument.
export const FENDERS=[{id:'portStern',x:-1.2/5.5,y:-1.02/2.1},{id:'starboardStern',x:-1.2/5.5,y:1.02/2.1},{id:'portBow',x:.9/5.5,y:-1.02/2.1},{id:'starboardBow',x:.9/5.5,y:1.02/2.1}];
export const HULL_SECTIONS={bow:[[2.23,-.43],[2.75,0],[2.23,.43]],portBow:[[.65,-.92],[1.6,-.72],[2.23,-.43]],portMid:[[-.65,-1.02],[.65,-.92]],portStern:[[-2.75,-.95],[-1.6,-1.02],[-.65,-1.02]],transom:[[-2.75,-.95],[-2.75,.95]],starboardStern:[[-2.75,.95],[-1.6,1.02],[-.65,1.02]],starboardMid:[[-.65,1.02],[.65,.92]],starboardBow:[[.65,.92],[1.6,.72],[2.23,.43]]};
export function impactClass(speed,fender=false){return speed<=(fender?.30:.15)?'gentle':speed<(fender?1.8:1.5)?'damage':'destruction';}
export function contactZone(b,arm){
 const c=Math.cos(b.a),s=Math.sin(b.a),x=(arm.x*c+arm.y*s)/b.spec.length,y=(-arm.x*s+arm.y*c)/b.spec.beam;
 if(x>.39)return'bow';if(x<-.43&&Math.abs(y)<.35)return'transom';
 return(y<0?'port':'starboard')+(x>.10?'Bow':x<-.10?'Stern':'Mid');
}
export function recordImpact(b,{arm,speed,effective,protectedContact=false,fender=null,target='dock',dock=true,damage:contactDamage},notify=()=>{}){
 if(speed<.025)return;
 const bottom=target==='bottom',zone=bottom?bottomZone(b,arm):contactZone(b,arm),key=target+':'+(fender||zone);
 const energy=.5*effective*speed*speed,kind=contactDamage===undefined?impactClass(speed,protectedContact):contactDamage>=100?'destruction':contactDamage>0?'damage':'gentle';
 // Use absorbed energy, not a speed threshold that instantly writes off a hull.
 // A continuous squeeze is one impact: only an increase of its peak severity
 // adds damage. Oscillating contact solvers cannot charge the same energy again.
 const threshold=protectedContact?.30:.15,excess=Math.max(0,energy-.5*effective*threshold**2);
 const capacity=Math.max(4500,(b.spec.structureMass??b.spec.mass)*8)*(protectedContact?2.5:1);
 const raw=contactDamage??(kind==='gentle'?0:100*excess/capacity);
 b.contactEpisodes??={};let episode=b.contactEpisodes[key];
 if(!episode||b.time-episode.seen>.35)episode=b.contactEpisodes[key]={seen:b.time,peak:0,dockPeak:0};
 episode.seen=b.time;
 const damage=contactDamage===undefined?Math.max(0,raw-episode.peak):raw;episode.peak=Math.max(episode.peak,raw);
 const dockRaw=dock?100*Math.max(0,energy-80)/Math.max(9000,b.spec.mass*12):0,dockLoss=Math.max(0,dockRaw-episode.dockPeak);episode.dockPeak=Math.max(episode.dockPeak,dockRaw);
 b.impactTimes??={};if(contactDamage!==undefined&&b.time-(b.impactTimes[key]??-10)<.45)return;
 const report=b.time-(b.impactTimes[key]??-10)>=.45||damage>.1;
 b.damage=clamp(b.damage+damage,0,100);
 if(dock)b.dockDamage=clamp(b.dockDamage+dockLoss,0,100);
 const sections=bottom?(b.bottomDamage??={}):(b.sectionDamage??={});sections[zone]=clamp((sections[zone]??0)+damage,0,100);
 if(!report)return;b.impactTimes[key]=b.time;
 const impact={time:b.time,speed,energy,kind,protectedContact,fender,zone,target,damage};
 b.lastImpact=impact;b.impacts??=[];b.impacts.push(impact);if(b.impacts.length>24)b.impacts.shift();
 if(speed>.08)notify(`${kind==='gentle'?'Łagodny kontakt':kind==='damage'?'Uszkodzenie':'Silna kolizja'} · ${ZONES[zone]??BOTTOM_ZONES[zone]}: ${speed.toFixed(2)} m/s · ${Math.round(energy)} J${protectedContact?' · odbijacz':''}`);
}
export function impactPaint(b,zone,fender=false){
 const hits=(b.impacts??[]).filter(q=>fender?q.fender===zone:q.zone===zone&&(!q.protectedContact||q.damage>0));
 const hit=hits[hits.length-1],age=hit?b.time-hit.time:Infinity,flash=clamp(1-age/1.6,0,1);
 const damage=fender?0:((zone in BOTTOM_ZONES?b.bottomDamage:b.sectionDamage)?.[zone]??0);
 return{flash,damage,color:flash>0?(hit.kind==='gentle'?'#66bd8a':hit.kind==='damage'?'#ef9b43':'#e44e40'):damageColor(damage)};
}
