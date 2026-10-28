import {createFleetCraft,fleetName} from './fleet-craft.js';
import {MAX_FLEET,rigBoat,syncFleetWorld} from './fleet.js';
import {createTowRig,placeTrailerBoat,trailerBollardIndex,bodyPoint,SUV} from './towing.js';
import {attachRope} from './rigging.js';
import {connectWinch} from './trailer-winch.js';
import {bottomAt,BUILDINGS,DOCKS} from './world.js';
import {hullContactSamples} from './hull-geometry.js';
import {circleSolidHit} from './solid-geometry.js';
import {vehicleSurface} from './vehicle-terrain.js';
export function fleetTrailerStatus(fleet){
 const b=rigBoat(fleet),r=b.towRig;
 if(!r)return{ok:false,message:'Brak przyczepy.'};
 if(r.boatLoaded||r.secured||b.trailerSupport?.kg>5||r.winch.attached||fleet.boats.some(q=>q.ropes.some(l=>l.bollard===trailerBollardIndex())))return{ok:false,message:'Przyczepa zajęta. Zwoduj lub oddaj poprzednią łódź i odepnij wciągarkę oraz cumę.'};
 if(Math.max(Math.hypot(r.car.vx,r.car.vy),Math.hypot(r.trailer.vx,r.trailer.vy))>.05)return{ok:false,message:'Zatrzymaj SUV-a i przyczepę.'};
 if(!(r.gear==='P'||r.handbrake||r.trailerPark))return{ok:false,message:'Włącz P lub hamulec postojowy.'};
 const t=r.trailer;if(bottomAt(t.x,t.y).depth>0||vehicleSurface(t.x,t.y).material!=='concrete')return{ok:false,message:'Nową łódź ustawisz na pustej przyczepie na suchym parkingu.'};
 return{ok:true,message:'Pusta przyczepa na parkingu · zostanie dopasowana do nowej łodzi.'};
}
export function spawnFleetTrailer(fleet,kind,options={}){
 const status=fleetTrailerStatus(fleet);if(!status.ok)return status;
 if(fleet.boats.filter(b=>!b.stored).length>=MAX_FLEET)return{ok:false,message:'Maksymalnie 8 jednostek.'};
 const old=rigBoat(fleet),r=old.towRig,b=createFleetCraft(kind,options);
 // Construct dimensions off-scene, then test the whole new loaded trailer.
 const candidate=createTowRig(b),angle=r.trailer.a,pin=r.attached?bodyPoint(r.car,-SUV.hitch):bodyPoint(r.trailer,r.trailer.hitch),t=candidate.trailer;
 t.a=angle;t.x=pin.x-Math.cos(angle)*t.hitch;t.y=pin.y-Math.sin(angle)*t.hitch;
 for(const x of[t.offset-b.spec.length*.52,t.offset,t.offset+b.spec.length*.52]){const p=bodyPoint(t,x);if(bottomAt(p.x,p.y).depth>0)return{ok:false,message:'Za mało suchego miejsca na tę łódź. Przestaw przyczepę dalej na parking.'};}
 const target=bodyPoint(t,t.offset);const probe={...b,...target,a:angle};for(const sample of hullContactSamples(b.spec)){const p=bodyPoint(probe,sample.x,sample.y);if([...BUILDINGS,...DOCKS].some(d=>circleSolidHit(p,sample.radius,d)))return{ok:false,message:'Za mało miejsca na kadłub. Przestaw pustą przyczepę dalej od budynku lub pomostu.'};}if(fleet.boats.some(q=>!q.stored&&Math.hypot(q.x-target.x,q.y-target.y)<(q.spec.length+b.spec.length)/2+1))return{ok:false,message:'Miejsce nowej łodzi zajmuje inna jednostka.'};
 delete old.towRig;delete old.trailerSupport;old.launchMotion=false;
 Object.assign(r,{trailer:t,boatLength:b.spec.length,boatLoaded:true,secured:true,securedPose:undefined,winch:candidate.winch,loadingScore:candidate.loadingScore,geometryVersion:1,ropeForce:{x:0,y:0,torque:0},postBroken:false,trailerDamage:0,hitchDamage:0});
 Object.assign(b,{booms:old.booms,buoys:old.buoys,traffic:old.traffic,id:'boat-'+fleet.nextId++,time:fleet.time,trail:[],towRig:r,occupied:false});b.name=fleetName(b)+' · '+b.id.slice(5);
 for(const en of b.engines){en.key='off';en.rpm=en.n=en.gear=en.thrust=0;if(!b.spec.jet&&!b.spec.air&&b.spec.propulsion!=='inboard')en.trim=en.trimTarget=1;}
 // Loaded-start attachment is created only after worldRig points to this rig.
 fleet.boats=fleet.boats.filter(q=>!q.stored);fleet.boats.push(b);fleet.rigBoatId=b.id;syncFleetWorld(fleet);placeTrailerBoat(r,b);
 b.ropes=[];r.winch.attached=false;attachRope(b,'bow',trailerBollardIndex());connectWinch(r,b);r.status='Nowa łódź na przyczepie · zabezpieczenia zapięte';
 return{ok:true,boat:b,message:r.status};
}
