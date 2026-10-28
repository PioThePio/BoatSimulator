import {SPARE_TRAILER_BAYS,RETURN_BAY,HANGAR,rectContains} from './port-yard.js';
import {rigBoat,syncFleetWorld} from './fleet.js';
import {bodyPoint,hitchStatus,hitchAction,placeTrailerBoat} from './towing.js';
export function ensureSpareTrailers(r,b){
 if(r.parkedTrailers)return;r.parkedTrailers=SPARE_TRAILER_BAYS.map((q,i)=>({id:'yard-trailer-'+(i+1),boatLength:b.spec.length,spec:{length:b.spec.length,beam:b.spec.beam,draft:b.spec.draft},trailer:{...r.trailer,x:q.x,y:q.y,a:Math.PI/2,vx:0,vy:0,w:0,mass:r.trailer.emptyMass,iz:r.trailer.emptyMass*(b.spec.length**2+r.trailer.beam**2)/12}}));
}
export function spareHitchAction(r,b){
 ensureSpareTrailers(r,b);if(r.attached)return hitchAction(r);
 if(r.boatLoaded)return hitchAction(r);
 const h=hitchStatus(r);if(h.ready)return hitchAction(r);
 const candidates=r.parkedTrailers.map(q=>({q,h:hitchStatus({...r,trailer:q.trailer})})).filter(q=>q.h.ready).sort((a,b)=>a.h.distance-b.h.distance);
 if(!candidates.length)return{ok:false,message:'Podjedź hakiem do zaczepu jednej z przyczep na 80 cm i zatrzymaj SUV-a.'};
 const next=candidates[0].q,old={id:r.trailerId??'main-trailer',trailer:r.trailer,boatLength:r.boatLength,spec:{length:b.spec.length,beam:b.spec.beam,draft:b.spec.draft}};
 r.parkedTrailers=r.parkedTrailers.filter(q=>q!==next);r.parkedTrailers.push(old);r.trailer=next.trailer;r.boatLength=next.boatLength;r.trailerId=next.id;r.winch.attached=false;r.secured=false;
 const result=hitchAction(r);if(result.ok)r.status='Podpięto przyczepę z parkingu';return{...result,message:r.status};
}
export function depotStatus(fleet){
 const b=rigBoat(fleet),r=b.towRig;if(!r?.boatLoaded||!r.secured)return{ok:false,message:'Przywieź zabezpieczoną łódź na przyczepie.'};
 if(r.attached)return{ok:false,message:'Zatrzymaj zestaw w hangarze i odczep przyczepę.'};
 const p=bodyPoint(r.trailer,r.trailer.offset),q=RETURN_BAY;
 if(!rectContains(q,p.x,p.y)||Math.cos(r.trailer.a-q.heading)<.94)return{ok:false,message:'Cofnij przyczepę w białe stanowisko wewnątrz hangaru.'};
 const tail=bodyPoint(r.trailer,r.trailer.offset-b.spec.length*.52),front=bodyPoint(r.trailer,r.trailer.hitch);if(![tail,front].every(p=>rectContains({x:HANGAR.x+.5,y:HANGAR.y+.5,w:HANGAR.w-1,h:HANGAR.h-1},p.x,p.y)))return{ok:false,message:'Cofnij całą przyczepę do środka hangaru.'};
 if(Math.hypot(r.car.vx,r.car.vy)>.1||Math.hypot(r.trailer.vx,r.trailer.vy)>.05)return{ok:false,message:'Zatrzymaj pojazd i przyczepę.'};
 if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki oddawanej łodzi.'};
 return{ok:true,message:'Łódź gotowa do zdania w hangarze.'};
}
export function returnBoat(fleet){
 const allowed=depotStatus(fleet);if(!allowed.ok)return allowed;const b=rigBoat(fleet),r=b.towRig;
 // Keep a valid owner for the single SUV and old save schema. The deposited
 // hull is dormant and removed from water, rendering and collision queries.
 b.stored=true;b.ropes=[];b.throttle=b.throttle2=0;b.vx=b.vy=b.w=0;b.wake=[];b.brakingWaves=[];b.anchor.mode='stowed';
 r.boatLoaded=r.secured=false;delete r.securedPose;r.winch.attached=false;r.winch.control=r.winch.tension=0;delete b.trailerSupport;r.trailer.mass=r.trailer.emptyMass;
 fleet.tows=fleet.tows.filter(q=>q.from!==b.id&&q.to!==b.id);r.status='Łódź zdana w hangarze · przyczepa wolna';syncFleetWorld(fleet);return{ok:true,message:r.status};
}
