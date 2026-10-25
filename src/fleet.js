import {solidPose} from './solid-geometry.js';
import {step} from './physics.js';
import {createFleetCraft,fleetName} from './fleet-craft.js';
import {bottomAt,shoreAt,SOLIDS,WORLD} from './world.js';
import {hullOutline} from './hull-geometry.js';
import {point} from './rigging.js';
import {towStep,trailerContact} from './towing.js';
import {marineTowStep} from './marine-tow.js';
import {fleetContacts} from './fleet-contacts.js';
import {recordTrail} from './trail.js';
import {vesselInteractions} from './interaction-scene.js';
import {createRescue} from './rescue.js';
import {rescueStep} from './rescue-scene.js';
export const MAX_FLEET=8;
export const rigBoat=fleet=>fleet.boats.find(b=>b.id===fleet.rigBoatId)??fleet.boats[0];
export const activeBoat=fleet=>fleet.boats.find(b=>b.id===fleet.activeId)??fleet.boats[0];
export function createFleet(boat){
 boat.id='boat-1';boat.name=fleetName(boat);boat.trail??=[];boat.occupied=true;
 const fleet={boats:[boat],activeId:boat.id,rigBoatId:boat.id,nextId:2,nextTowId:1,tows:[],time:boat.time,rescue:createRescue()};syncFleetWorld(fleet);return fleet;
}
export function syncFleetWorld(fleet){
 const owner=rigBoat(fleet),world=fleet.boats[0];
 for(const b of fleet.boats){b.booms=world.booms;b.buoys=world.buoys;b.traffic=world.traffic;b.worldRig=owner.towRig;b.occupied=b.id===fleet.activeId;
  b.wakeSources=fleet.boats.filter(q=>q!==b).map(q=>({id:q.id,history:q.wake,braking:q.brakingWaves}));
 }
}
function overlaps(a,b,margin=.18){
 const axes=[a.a,b.a].flatMap(angle=>[{x:Math.cos(angle),y:Math.sin(angle)},{x:-Math.sin(angle),y:Math.cos(angle)}]);
 for(const n of axes){const radius=q=>Math.abs(n.x*Math.cos(q.a)+n.y*Math.sin(q.a))*q.spec.length*.5+Math.abs(-n.x*Math.sin(q.a)+n.y*Math.cos(q.a))*q.spec.beam*.5;
  if(Math.abs((a.x-b.x)*n.x+(a.y-b.y)*n.y)>radius(a)+radius(b)+margin)return false;
 }return true;
}
export function placementStatus(fleet,b,pose,{grounded=false,traffic=true}={}){
 if(!Number.isFinite(pose.x)||!Number.isFinite(pose.y)||pose.x<WORLD.left||pose.x>WORLD.right||pose.y<WORLD.top||pose.y>WORLD.bottom)return{ok:false,message:'Wskaż miejsce na akwenie.'};
 const probe={...b,...pose},samples=[{x:probe.x,y:probe.y},...hullOutline(b.spec).map(q=>point(probe,q.x,q.y))];
 if(samples.some(p=>shoreAt(p.x,p.y).land))return{ok:false,message:'Cały kadłub musi znajdować się nad wodą.'};
 if(SOLIDS.some(d=>overlaps(probe,{...solidPose(d),spec:{length:solidPose(d).length,beam:solidPose(d).width}}))||fleet.boats[0].booms.some(q=>overlaps(probe,{x:q.x1+Math.cos(q.a)*q.length/2,y:q.y1+Math.sin(q.a)*q.length/2,a:q.a,spec:{length:q.length,beam:q.width}})))return{ok:false,message:'To miejsce zajmuje pomost lub przeszkoda.'};
 if([...fleet.boats,...traffic?fleet.boats[0].traffic:[]].some(q=>overlaps(probe,q)))return{ok:false,message:'Zostaw odstęp od pozostałych jednostek.'};
 if(!grounded&&samples.some(p=>bottomAt(p.x,p.y).depth<b.spec.draft+.08))return{ok:false,message:'Za płytko. Wybierz głębszą wodę albo stan „na mieliźnie”.'};
 if(grounded&&!samples.some(p=>bottomAt(p.x,p.y).depth<b.spec.draft))return{ok:false,message:'Dla osiadłej łodzi wskaż płytką wodę przy brzegu lub mieliznę.'};
 return{ok:true};
}
export function addFleetBoat(fleet,kind,pose,options={}){
 if(fleet.boats.length>=MAX_FLEET)return{ok:false,message:'Maksymalnie 8 jednostek w tej próbie.'};
 const b=createFleetCraft(kind,options),status=placementStatus(fleet,b,pose,{grounded:options.condition==='grounded',traffic:options.traffic!==false});if(!status.ok)return status;
 Object.assign(b,{x:pose.x,y:pose.y,a:pose.a??0,time:fleet.time,id:'boat-'+fleet.nextId++,trail:[],occupied:false});b.name=fleetName(b)+' · '+b.id.slice(5);
 if(options.condition==='broken'&&!b.spec.passive){b.disabledEngine=true;for(const en of b.engines)en.propDamage=100;b.events.unshift({time:b.time,message:'Awaria napędu · jednostka wymaga holowania do serwisu.'});}
 fleet.boats.push(b);syncFleetWorld(fleet);return{ok:true,boat:b,message:'Dodano: '+b.name};
}
export function selectFleetBoat(fleet,id){
 const b=fleet.boats.find(q=>q.id===id);if(!b)return{ok:false,message:'Nie ma tej jednostki.'};
 const old=activeBoat(fleet);old.throttle=old.throttle2=0;old.thrusters.bow=old.thrusters.stern=0;for(const r of old.ropes)r.control=0;
 for(const r of fleet.tows)r.control=0;fleet.activeId=id;syncFleetWorld(fleet);return{ok:true,boat:b,message:'Stanowisko: '+fleetName(b)};
}
export function fleetStep(fleet,env,dt){
 syncFleetWorld(fleet);const owner=rigBoat(fleet),rig=owner.towRig;if(rig)towStep(rig,owner,dt);
 for(const b of fleet.boats){b.maxTowTension=0;b.towHeel=0;}
 vesselInteractions(fleet,env,dt);
 marineTowStep(fleet,dt);
 for(const [i,b]of fleet.boats.entries()){step(b,env,dt,{sharedStep:i===0});if(b===owner&&rig)trailerContact(rig,b,dt);}
 for(let i=0;i<fleet.boats.length;i++)for(let j=i+1;j<fleet.boats.length;j++)fleetContacts(fleet.boats[i],fleet.boats[j],dt);
 fleet.time=fleet.boats[0].time;
 rescueStep(fleet,env,dt);
}
export function recordFleetTrails(fleet){for(const b of fleet.boats)if(!b.towRig?.boatLoaded)recordTrail(b.trail,b);}

export function removeFleetBoat(fleet,id){
 const b=fleet.boats.find(q=>q.id===id);if(!b)return{ok:false,message:'Nie ma tej jednostki.'};
 if(fleet.boats.length===1)return{ok:false,message:'Pozostaw co najmniej jedną jednostkę.'};
 if(id===fleet.rigBoatId)return{ok:false,message:'Jednostka przypisana do SUV-a pozostaje w sesji. Usuń dodatkową jednostkę.'};
 fleet.tows=fleet.tows.filter(r=>r.from!==id&&r.to!==id);fleet.boats=fleet.boats.filter(q=>q!==b);
 if(fleet.activeId===id)fleet.activeId=fleet.rigBoatId;syncFleetWorld(fleet);return{ok:true,boat:activeBoat(fleet),message:'Usunięto: '+b.name};
}
