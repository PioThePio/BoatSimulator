import {SERVICE_STATION,SERVICE_BAYS,clamp} from './world.js';
import {cleat} from './rigging.js';
import {mooringPoint} from './marina.js';

export function serviceStatus(b){
 const rig=b.towRig;
 if(rig?.boatLoaded){
  const fits=(q,L,B,rect)=>{const x=(Math.abs(Math.cos(q.a))*L+Math.abs(Math.sin(q.a))*B)/2,y=(Math.abs(Math.sin(q.a))*L+Math.abs(Math.cos(q.a))*B)/2;return q.x-x>=rect.x&&q.x+x<=rect.x+rect.w&&q.y-y>=rect.y&&q.y+y<=rect.y+rect.h;};
  const bay=SERVICE_BAYS.find(q=>fits(b,b.spec.length,b.spec.beam,q)&&(!rig.attached||fits(rig.car,4.9,2,q)));
  if(!bay)return{ok:false,message:'Wjedź całym zestawem w jedno z dwóch stanowisk SERWIS na parkingu.'};
  if(!rig.secured)return{ok:false,message:'Zabezpiecz łódź na przyczepie przed naprawą.'};
  if(Math.hypot(rig.car.vx,rig.car.vy)>.12||Math.hypot(b.vx,b.vy)>.12||!(rig.gear==='P'||rig.handbrake||rig.trailerPark))return{ok:false,message:'Zatrzymaj zestaw i włącz P lub hamulec ręczny.'};
  if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki łodzi i zapłon przed naprawą.'};
  return{ok:true,land:true,message:`Stanowisko serwisowe ${bay.id} · gotowy do naprawy`};
 }
 const q=SERVICE_STATION,S=b.spec,reachX=(Math.abs(Math.cos(b.a))*S.length+Math.abs(Math.sin(b.a))*S.beam)/2,reachY=(Math.abs(Math.sin(b.a))*S.length+Math.abs(Math.cos(b.a))*S.beam)/2;
 if(b.x-reachX<q.x||b.x+reachX>q.x+q.w||b.y-reachY<q.y||b.y+reachY>q.y+q.h)return{ok:false,message:'Dopłyń do zatoczki serwisowej przy slipie, na wschód od głównego portu.'};
 if(Math.hypot(b.vx,b.vy)>.12||Math.abs(b.w)>.025)return{ok:false,message:'Zatrzymaj łódź przy slipie przed naprawą.'};
 if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki i zapłon przed naprawą.'};
 const tied=b.ropes.some(r=>{const p=cleat(b,r.end),point=mooringPoint(b,r.bollard);return point?.kind==='bollard'&&!point.trailer&&point.x>=q.x-.1&&point.x<=q.x+q.w+.1&&point.y>=q.y-2&&point.y<=q.y+q.h+2&&Math.hypot(p.x-point.x,p.y-point.y)<=r.length+.3;});
 if(!tied)return{ok:false,message:'Przycumuj przynajmniej jedną liną do pomostu serwisowego.'};
 return{ok:true,message:'Gotowy do naprawy przy slipie.'};
}
export function requestRepair(b){
 const service=b.service;
 if(service.active){service.active=false;service.status='Naprawa zatrzymana';return{ok:true,message:service.status};}
 const allowed=serviceStatus(b);if(!allowed.ok)return allowed;
 const damage=b.damage+b.engines.reduce((sum,en)=>sum+en.propDamage,0);
 if(damage<=0)return{ok:false,message:'Łódź i napęd nie wymagają naprawy.'};
 service.active=true;service.initial=damage;service.progress=0;service.status='Naprawa przy slipie';b.throttle=b.throttle2=0;
 return{ok:true,message:allowed.land?'Naprawa na przyczepie · pozostań na stanowisku.':'Naprawa rozpoczęta. Pozostań przycumowany z wyłączonym zapłonem.'};
}
export function serviceStep(b,dt){
 const service=b.service;if(!service.active)return;
 const allowed=serviceStatus(b);if(!allowed.ok){service.active=false;service.status='Naprawa przerwana · '+allowed.message;return;}
 const before=b.damage;b.damage=Math.max(0,b.damage-3*dt);const fraction=before>0?b.damage/before:0;
 for(const map of [b.sectionDamage,b.bottomDamage])for(const id of Object.keys(map??{}))map[id]*=fraction;
 for(const en of b.engines)en.propDamage=Math.max(0,en.propDamage-4*dt);
 const remaining=b.damage+b.engines.reduce((sum,en)=>sum+en.propDamage,0);service.progress=clamp(1-remaining/service.initial,0,1);
 if(remaining<1e-8){
  b.damage=0;b.sectionDamage={};b.bottomDamage={};b.impacts=[];b.impactTimes={};b.lastImpact=null;
  for(const en of b.engines){en.propDamage=0;en.thermalTrip=false;}
  if(b.bilge)b.bilge.driveLeak=0;
  service.active=false;service.progress=1;service.status='Naprawa zakończona · kadłub i napęd sprawne';
 }
}
