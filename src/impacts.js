import {clamp} from './world.js';
export const ZONES={bow:'Dziób',portBow:'Lewa burta · przód',portMid:'Lewa burta · środek',portStern:'Lewa rufa',transom:'Pawęż',starboardStern:'Prawa rufa',starboardMid:'Prawa burta · środek',starboardBow:'Prawa burta · przód'};
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
 const zone=contactZone(b,arm),key=target+':'+(fender||zone);
 b.impactTimes??={};if(b.time-(b.impactTimes[key]??-10)<.45)return;
 b.impactTimes[key]=b.time;
 const energy=.5*effective*speed*speed,kind=contactDamage===undefined?impactClass(speed,protectedContact):contactDamage>=100?'destruction':contactDamage>0?'damage':'gentle';
 const damage=contactDamage??(kind==='gentle'?0:kind==='destruction'?100:Math.min(75,Math.max(1,(energy-(protectedContact?40:10))/9)));
 b.damage=clamp(b.damage+damage,0,100);
 if(dock)b.dockDamage=clamp(b.dockDamage+(kind==='destruction'?100:Math.max(0,(energy-80)/18)),0,100);
 b.sectionDamage??={};b.sectionDamage[zone]=clamp((b.sectionDamage[zone]??0)+damage,0,100);
 const impact={time:b.time,speed,energy,kind,protectedContact,fender,zone,target,damage};
 b.lastImpact=impact;b.impacts??=[];b.impacts.push(impact);if(b.impacts.length>24)b.impacts.shift();
 if(speed>.08)notify(`${kind==='gentle'?'Łagodny kontakt':kind==='damage'?'Uszkodzenie':'Silna kolizja'} · ${ZONES[zone]}: ${speed.toFixed(2)} m/s · ${Math.round(energy)} J${protectedContact?' · odbijacz':''}`);
}
export function impactPaint(b,zone,fender=false){
 const hits=(b.impacts??[]).filter(q=>fender?q.fender===zone:q.zone===zone&&(!q.protectedContact||q.damage>0));
 const hit=hits[hits.length-1],age=hit?b.time-hit.time:Infinity,flash=clamp(1-age/1.6,0,1);
 const damage=fender?0:(b.sectionDamage?.[zone]??0);
 return{flash,damage,color:flash>0?(hit.kind==='gentle'?'#66bd8a':hit.kind==='damage'?'#ef9b43':'#e44e40'):damage>0?'#bf6350':null};
}
