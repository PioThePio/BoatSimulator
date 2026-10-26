import {updateMass,restoreFuelCapacity} from './craft.js';
import {migrateFuelBerth} from './fuel-migration.js';
import {restoreBuoys} from './buoys.js';
import {migrateSiteSave} from './site-migration.js';
import {migrateNieporetSave} from './nieporet-migration.js';
import {CRAFTS} from './craft.js';
import {createFleetCraft,TOWABLES} from './fleet-craft.js';
import {syncFleetWorld,MAX_FLEET} from './fleet.js';
import {BOLLARDS,MAP_STARTS,shoreAt,bottomAt,SOLIDS,NIEPORET} from './world.js';
import {WORLD_DISTANCE_SCALE} from './zegrze.js';
import {createRescue,validRescueState} from './rescue.js';

export const SAVE_KEY='przystan-session-v1',BACKUP_KEY=SAVE_KEY+'-backup',SAVE_VERSION=1,AUTOSAVE_SECONDS=30;
const omitted=new Set(['booms','buoys','traffic','towRig','worldRig','wakeSources']);
function boatData(b){return Object.fromEntries(Object.entries(b).filter(([key])=>!omitted.has(key)));}
export function snapshotSession(session,now=Date.now()){
 const {fleet,env,start,boatOptions,vehicle,ui={},weather={}}=session,world=fleet.boats[0],rig=session.towRig??fleet.boats.find(b=>b.id===fleet.rigBoatId)?.towRig;
 return{version:SAVE_VERSION,siteGeometryVersion:3,fuelBerthVersion:1,worldScale:WORLD_DISTANCE_SCALE,savedAt:now,
  fleet:{...fleet,boats:fleet.boats.map(boatData),tows:fleet.tows.map(r=>({...r,control:0,rate:0}))},
  world:{booms:world.booms,buoys:world.buoys,traffic:world.traffic},rig:rig?Object.fromEntries(Object.entries(rig).filter(([key])=>key!=='audioBoat')):null,
  env,start,boatOptions,vehicle,ui,weather};
}
const finite=(v,lo=-1e8,hi=1e8)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
function validateTree(value){
 let count=0;const visit=(v,depth=0)=>{if(++count>350000||depth>30)throw Error('Zbyt duży zapis.');if(typeof v==='number'&&!Number.isFinite(v))throw Error('Błędna liczba.');if(v&&typeof v==='object')for(const [key,q]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(key))throw Error('Błędne pole.');visit(q,depth+1);}};visit(value);
}
let expectedBoomCount;
export function restoreSession(value,{validateOnly=false}={}){
 try{
  const data=typeof value==='string'?JSON.parse(value):JSON.parse(JSON.stringify(value));
  if(data?.version!==SAVE_VERSION||data.worldScale!==WORLD_DISTANCE_SCALE||!finite(data.savedAt,0,1e15))throw Error('Nieobsługiwana wersja zapisu.');
  if(data.siteGeometryVersion!==undefined&&![1,2,3].includes(data.siteGeometryVersion))throw Error('Nieobsługiwana geometria miejsc.');
  validateTree(data);const f=data.fleet;if(!Array.isArray(f?.boats)||!f.boats.length||f.boats.length>MAX_FLEET||!Array.isArray(f.tows)||f.tows.length>64)throw Error('Błędna flota.');
  f.rescue??=createRescue();if(!validRescueState(f.rescue))throw Error('Błędny stan ratownictwa.');
  const ids=new Set();for(const b of f.boats){
   if(typeof b.id!=='string'||!/^boat-\d+$/.test(b.id)||ids.has(b.id))throw Error('Błędny identyfikator.');ids.add(b.id);
   if(!finite(b.x)||!finite(b.y)||!finite(b.a)||!finite(b.vx,-150,150)||!finite(b.vy,-150,150)||!finite(b.w,-30,30)||!finite(b.time,0)||!finite(b.spec?.mass,5,30000)||!finite(b.spec.length,1,15)||!finite(b.spec.beam,.4,5)||!finite(b.battery?.soc,0,1))throw Error('Błędny stan jednostki.');
   if(!Array.isArray(b.engines)||b.engines.length<1||b.engines.length>2||!Array.isArray(b.ropes)||b.ropes.length>12||b.ropes.some(r=>!Number.isInteger(r.bollard)||r.bollard<0||r.bollard>=BOLLARDS.length||!finite(r.length,.1,100)))throw Error('Błędny osprzęt jednostki.');
   if(!Array.isArray(b.trail)||b.trail.length>1800||!Array.isArray(b.wake)||b.wake.length>2000)throw Error('Błędna trasa.');
  }
  if(!ids.has(f.activeId)||!ids.has(f.rigBoatId)||!finite(f.nextId,2,1e6)||!finite(f.nextTowId,1,1e6)||!finite(f.time,0))throw Error('Błędna sesja.');
  if(f.tows.some(r=>!ids.has(r.from)||!ids.has(r.to)||r.from===r.to||!finite(r.length,.6,60)||!finite(r.strength,1000,40000)||!finite(r.EA,1000,1e7)||!['bow','stern','portBow','starboardBow','portStern','starboardStern','portMid','starboardMid','towCenter'].includes(r.fromEnd)||!['bow','stern','portBow','starboardBow','portStern','starboardStern','portMid','starboardMid','towCenter'].includes(r.toEnd)))throw Error('Błędny hol.');
  expectedBoomCount??=createFleetCraft('runabout').booms.length;if(!Array.isArray(data.world?.booms)||data.world.booms.length!==expectedBoomCount||!data.world.buoys||!Array.isArray(data.world.traffic))throw Error('Błędny stan akwenu.');
  if(data.rig&&(!finite(data.rig.car?.x)||!finite(data.rig.car?.y)||!finite(data.rig.trailer?.x)||!finite(data.rig.trailer?.y)||!data.rig.winch))throw Error('Błędny stan SUV-a.');
  if(validateOnly)return{ok:true};
  const oldSite=data.siteGeometryVersion??1,base=createFleetCraft('runabout'),context={points:BOLLARDS,starts:MAP_STARTS,shoreAt,bottomAt,solids:SOLIDS,world:base};const skip=migrateSiteSave(data,context);migrateNieporetSave(data,{...context,skip});
  if(oldSite>=3)migrateFuelBerth(data,NIEPORET.fuel,{x:NIEPORET.anchor.x+8,y:NIEPORET.anchor.y},BOLLARDS);
  f.boats=f.boats.map(saved=>{const b=createFleetCraft(saved.fleetKind??saved.spec.profile);Object.assign(b,saved);const name=TOWABLES[b.fleetKind]?.name??CRAFTS[b.spec.profile]?.name??b.spec.name;if(b.name===b.spec.name||/ · \d+$/.test(b.name??''))b.name=name+(b.name?.match(/ · \d+$/)?.[0]??'');b.spec.name=name;if(!b.spec.engineType){b.spec.engineType='petrol';if(b.spec.racing){b.spec.diesel=false;b.spec.fuelDensity=.745;updateMass(b.spec,b.fuel.litres,b.bilge?.litres??0);}}restoreFuelCapacity(b);if(b.fleetKind==='banana'||b.fleetKind==='mat')b.spec.inflatable=true;for(const r of b.ropes){r.control=0;r.rate=0;r.effortTime=0;}b.thrusters.bow=b.thrusters.stern=0;return b;});
  const trafficById=new Map(data.world.traffic.map(q=>[q.id,q]));
  data.world.traffic=base.traffic.map(q=>{const saved=trafficById.get(q.id);return saved?{...q,...saved,spec:{...q.spec,...saved.spec}}:q;});
  data.world.buoys=restoreBuoys(data.world.buoys,base.buoys,[...f.boats,...data.world.traffic]);
  Object.assign(f.boats[0],data.world);
  if(data.rig){if(!finite(data.rig.car?.x)||!finite(data.rig.car?.y)||!finite(data.rig.trailer?.x)||!finite(data.rig.trailer?.y)||!data.rig.winch)throw Error('Błędny stan SUV-a.');const r=data.rig;r.gas=r.brake=0;r.winch.control=0;f.boats.find(b=>b.id===f.rigBoatId).towRig=r;}
  for(const r of f.tows)r.control=r.rate=0;syncFleetWorld(f);
  return{ok:true,session:{...data,towRig:data.rig,fleet:f}};
 }catch(error){return{ok:false,message:'Nie można odczytać lokalnego zapisu: '+error.message};}
}
export function readAutosave(storage){
 let problem='';for(const key of [SAVE_KEY,BACKUP_KEY]){try{const raw=storage.getItem(key);if(!raw)continue;const result=restoreSession(raw);if(result.ok)return{...result,backup:key===BACKUP_KEY};problem=result.message;}catch{problem='Przeglądarka zablokowała dostęp do zapisu lokalnego.';}}
 return{ok:false,message:problem};
}
export function writeAutosave(storage,session,now=Date.now()){
 try{
  const raw=JSON.stringify(snapshotSession(session,now));if(raw.length>4_000_000)throw Error('Zapis przekracza dostępny rozmiar.');
  if(!restoreSession(raw,{validateOnly:true}).ok)throw Error('Błędny stan symulacji.');
  const old=storage.getItem(SAVE_KEY);if(old&&restoreSession(old,{validateOnly:true}).ok)try{storage.setItem(BACKUP_KEY,old);}catch{}
  storage.setItem(SAVE_KEY,raw);return{ok:true,savedAt:now};
 }catch{return{ok:false,message:'Zapis lokalny niedostępny lub brak miejsca. Zezwól na dane tej strony w przeglądarce.'};}
}
