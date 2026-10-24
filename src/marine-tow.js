import {clamp} from './world.js';
import {cleat,inverseMass,impulse} from './rigging.js';
import {attachmentNames} from './attachment-points.js';

export const TOW_LIMITS={minLength:.6,maxLength:60,throwDistance:25,haulSpeed:.28,paySpeed:.75,handForce:450,handPower:65};
const velocity=(b,p)=>({x:b.vx-b.w*(p.y-b.y),y:b.vy+b.w*(p.x-b.x)});
export function connectBoatPoints(fleet,fromId,fromEnd,toId,toEnd,{strength=18000}={}){
 const a=fleet.boats.find(b=>b.id===fromId),b=fleet.boats.find(b=>b.id===toId);
 if(!a||!b||a===b||!attachmentNames(a)[fromEnd]||!attachmentNames(b)[toEnd])return{ok:false,message:'Wybierz dostępne punkty dwóch różnych jednostek.'};
 const occupied=(body,end)=>body.ropes.some(r=>r.end===end)||fleet.tows.some(r=>!r.broken&&(r.from===body.id&&r.fromEnd===end||r.to===body.id&&r.toEnd===end));
 if(occupied(a,fromEnd)||occupied(b,toEnd))return{ok:false,message:'Ten punkt ma już linę. Najpierw ją odłącz.'};
 if([a,b].some(q=>q.towRig?.secured&&q.towRig.boatLoaded))return{ok:false,message:'Najpierw zwoduj i odbezpiecz łódź.'};
 const p=cleat(a,fromEnd),q=cleat(b,toEnd),d=Math.hypot(q.x-p.x,q.y-p.y);if(d>25)return{ok:false,message:'Podejdź bliżej wybranego punktu: maksymalnie 25 m.'};
 fleet.tows=[...fleet.tows.filter(r=>!r.broken),...fleet.tows.filter(r=>r.broken).slice(-16)];const group='hol-'+fleet.nextTowId++;fleet.tows.push({id:group+'-0',group,from:fromId,to:toId,fromEnd,toEnd,mode:'points',length:Math.max(.6,d+.35),strength:Math.min(strength,a.spec.lineBreak,b.spec.lineBreak),EA:Math.min(a.spec.lineEA,b.spec.lineEA),tension:0,peak:0,control:0,rate:0,broken:false});
 return{ok:true,message:'Założono linę między wybranymi punktami · bez przyciągania.'};
}
export function connectMarineTow(fleet,fromId,toId,{mode='astern',strength=18000,length}={}){
 const a=fleet.boats.find(b=>b.id===fromId),b=fleet.boats.find(b=>b.id===toId);
 if(!a||!b||a===b)return{ok:false,message:'Wybierz inną jednostkę do holowania.'};
 if([a,b].some(q=>q.towRig?.secured&&q.towRig.boatLoaded))return{ok:false,message:'Najpierw zwoduj i odbezpiecz łódź na przyczepie.'};
 if(fleet.tows.some(r=>!r.broken&&[r.from,r.to].includes(toId)))return{ok:false,message:'Ta jednostka ma już połączenie holownicze.'};
 // No closed tow loops: each receiving hull can be attached to one tow group.
 const connected=new Set([fromId]);for(let i=0;i<fleet.boats.length;i++)for(const r of fleet.tows)if(!r.broken&&(connected.has(r.from)||connected.has(r.to))){connected.add(r.from);connected.add(r.to);}
 if(connected.has(toId))return{ok:false,message:'Te jednostki są już połączone linami.'};
 const ends=mode==='alongside'?[['starboardBow','portBow'],['starboardStern','portStern']]:[['stern','bow']];
 const lines=ends.map(([fromEnd,toEnd])=>{const p=cleat(a,fromEnd),q=cleat(b,toEnd),d=Math.hypot(q.x-p.x,q.y-p.y);return{fromEnd,toEnd,d};});
 if(lines.some(q=>q.d>TOW_LIMITS.throwDistance))return{ok:false,message:'Podejdź bliżej: lina holownicza ma zasięg rzutu 25 m.'};
 const group='hol-'+fleet.nextTowId++;
 for(const [i,q]of lines.entries())fleet.tows.push({id:group+'-'+i,group,from:fromId,to:toId,fromEnd:q.fromEnd,toEnd:q.toEnd,mode,length:clamp(Number.isFinite(length)?length:q.d+.5,TOW_LIMITS.minLength,60),
  strength:Math.min(clamp(strength,1000,40000),a.spec.lineBreak,b.spec.lineBreak),EA:Math.min(a.spec.lineEA,b.spec.lineEA),tension:0,peak:0,control:0,rate:0,broken:false});
 return{ok:true,message:mode==='alongside'?'Połączono burta w burtę dwiema linami.':'Założono hol od rufy do dziobu. Lina pozostaje luźna.'};
}
export function marineTowStep(fleet,dt){
 for(const r of fleet.tows){
  r.rate=0;if(r.broken)continue;
  const a=fleet.boats.find(b=>b.id===r.from),b=fleet.boats.find(b=>b.id===r.to);if(!a||!b)continue;
  const p=cleat(a,r.fromEnd),q=cleat(b,r.toEnd),d=Math.max(.001,Math.hypot(q.x-p.x,q.y-p.y)),n={x:(q.x-p.x)/d,y:(q.y-p.y)/d};
  const armA={x:p.x-a.x,y:p.y-a.y},armB={x:q.x-b.x,y:q.y-b.y},va=velocity(a,p),vb=velocity(b,q),separation=(vb.x-va.x)*n.x+(vb.y-va.y)*n.y;
  const inv=inverseMass(a,n,armA)+inverseMass(b,n,armB),k=r.EA/Math.max(1,r.length),damping=2*.22*Math.sqrt(k/inv),den=1+(damping*dt+k*dt*dt)*inv;
  if(r.control<0){
   const existing=k*(d-r.length)+(damping+k*dt)*separation;
   const allowance=Math.max(0,(TOW_LIMITS.handForce*den-existing)/(2*k+damping/dt));
   const amount=Math.min(TOW_LIMITS.haulSpeed*dt,TOW_LIMITS.handPower/Math.max(1,r.tension)*dt,allowance,r.length-TOW_LIMITS.minLength);
   r.length-=Math.max(0,amount);r.rate=amount>0?-amount/dt:0;r.blocked=amount<1e-6;
  }else if(r.control>0){const amount=Math.min(TOW_LIMITS.paySpeed*dt,60-r.length);r.length+=amount;r.rate=amount/dt;r.blocked=false;}
  const extension=d-r.length,closing=separation-r.rate,crossing=closing>0?clamp((extension+closing*dt)/(closing*dt),0,1):0;
  r.tension=extension>0||crossing>0?Math.max(0,(k*extension+(damping+k*dt)*closing)/den)*(extension>0?1:crossing):0;r.peak=Math.max(r.peak,r.tension);
  if(r.tension>r.strength){r.broken=true;r.breakTension=r.tension;r.tension=0;r.control=0;for(const q of [a,b]){q.events.unshift({time:q.time,message:`Zerwany hol · ${(r.breakTension/1000).toFixed(1)} kN > ${(r.strength/1000).toFixed(1)} kN.`});q.events.splice(12);}continue;}
  impulse(a,n,r.tension*dt,armA);impulse(b,n,-r.tension*dt,armB);
  a.maxTowTension=Math.max(a.maxTowTension??0,r.tension);b.maxTowTension=Math.max(b.maxTowTension??0,r.tension);
 }
}
