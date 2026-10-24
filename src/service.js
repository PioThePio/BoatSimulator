import {SERVICE_BAYS,DOCKS,clamp} from './world.js';
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
 if(!nearService(b))return{ok:false,message:'Dopłyń do pomostów serwisu obok slipu.'};
 if(Math.hypot(b.vx,b.vy)>.30||Math.abs(b.w)>.08)return{ok:false,message:'Zatrzymaj łódź przy pomoście serwisowym obok slipu.'};
 if(b.engines.some(en=>en.key!=='off'))return{ok:false,message:'Wyłącz silniki i zapłon przed naprawą.'};
 const tied=b.ropes.some(r=>{const p=cleat(b,r.end),point=mooringPoint(b,r.bollard);return isServicePoint(point)&&Math.hypot(p.x-point.x,p.y-point.y)<=r.length+.3&&Math.hypot(p.x-point.x,p.y-point.y)<8;});
 if(!tied)return{ok:false,message:'Przycumuj przynajmniej jedną liną do pomostu serwisowego.'};
 return{ok:true,message:'Gotowy do naprawy przy slipie.'};
}
export function isServicePoint(p){return p?.kind==='bollard'&&!p.trailer&&(p.service||DOCKS.some(d=>d.service&&p.x>=d.x-.2&&p.x<=d.x+d.w+.2&&p.y>=d.y-.2&&p.y<=d.y+d.h+.2));}
export function nearService(b){
 if(b.towRig?.boatLoaded)return SERVICE_BAYS.some(q=>Math.hypot(b.x-clamp(b.x,q.x,q.x+q.w),b.y-clamp(b.y,q.y,q.y+q.h))<5);
 return DOCKS.some(q=>q.service&&Math.hypot(b.x-clamp(b.x,q.x,q.x+q.w),b.y-clamp(b.y,q.y,q.y+q.h))<Math.min(12,b.spec.length*.5+6));
}
export function requestRepair(b){
 const service=b.service;
 if(service.active){service.active=false;service.status='Naprawa zatrzymana';return{ok:true,message:service.status};}
 const allowed=serviceStatus(b);if(!allowed.ok)return allowed;
 const damage=b.damage+b.engines.reduce((sum,en)=>sum+en.propDamage+(en.flooded?20:0),0)+(b.disabledEngine?20:0);
 if(damage<=0)return{ok:false,message:'Łódź i napęd nie wymagają naprawy.'};
 service.active=true;service.initial=damage;service.progress=0;service.status='Naprawa przy slipie';b.throttle=b.throttle2=0;
 for(const en of b.engines)en.floodRepair=en.flooded?20:0;
 return{ok:true,message:allowed.land?'Naprawa na przyczepie · pozostań na stanowisku.':'Naprawa rozpoczęta. Pozostań przycumowany z wyłączonym zapłonem.'};
}
export function serviceStep(b,dt){
 const service=b.service;if(!service.active)return;
 const allowed=serviceStatus(b);if(!allowed.ok){service.active=false;service.status='Naprawa przerwana · '+allowed.message;return;}
 const before=b.damage;b.damage=Math.max(0,b.damage-3*dt);const fraction=before>0?b.damage/before:0;
 for(const map of [b.sectionDamage,b.bottomDamage])for(const id of Object.keys(map??{}))map[id]*=fraction;
 for(const en of b.engines){en.propDamage=Math.max(0,en.propDamage-4*dt);en.floodRepair=Math.max(0,(en.floodRepair??0)-4*dt);if(en.flooded&&en.floodRepair===0){en.flooded=false;en.floodTime=0;}}
 const remaining=b.damage+b.engines.reduce((sum,en)=>sum+en.propDamage+en.floodRepair,0);service.progress=clamp(1-remaining/service.initial,0,1);
 if(remaining<1e-8){
  b.damage=0;b.disabledEngine=false;b.sectionDamage={};b.bottomDamage={};b.impacts=[];b.impactTimes={};b.lastImpact=null;
  for(const en of b.engines){en.propDamage=0;en.thermalTrip=false;en.flooded=false;en.floodTime=0;}
  if(b.bilge)b.bilge.driveLeak=0;
  if(b.electrics.floodFault){b.electrics.floodFault=false;b.electrics.master=false;b.battery.soc=.6;b.battery.voltage=12.3;}
  service.active=false;service.progress=1;service.status='Naprawa zakończona · kadłub i napęd sprawne';
 }
}
