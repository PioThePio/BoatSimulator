import {CRAFTS,updateMass} from './craft.js';
import {createBilge} from './bilge.js';
import {createAnchor} from './rigging.js';
import {clamp} from './world.js';
import {createBoat} from './physics.js';

// SI hulls; the inflatable loads include seated riders. They have no hidden motor.
export const TOWABLES={
 barge:{name:'Barka',length:10.5,beam:3.5,mass:4100,draft:.48,freeboard:.65,hullType:'flat',drag:1.65,lateral:1.2,windage:.9,wave:.65,breakForce:40000,color:'#929e8c'},
 banana:{name:'Banan',length:4.8,beam:1.1,mass:260,draft:.14,freeboard:.32,hullType:'flat',drag:.60,lateral:.45,windage:.55,wave:1.7,breakForce:6000,color:'#e8ce56',planing:true,sealed:true},
 mat:{name:'Materac',length:2.2,beam:1.6,mass:93,draft:.08,freeboard:.22,hullType:'flat',drag:1.1,lateral:.55,windage:.6,wave:1.9,breakForce:5000,color:'#d69b61',planing:true,sealed:true},
 rowboat:{name:'Wiosłówka',length:3.8,beam:1.5,mass:140,draft:.18,freeboard:.36,hullType:'v',drag:.85,lateral:1,windage:.55,wave:1.2,breakForce:6000,color:'#d1ba91',manual:true},
 kayak:{name:'Kajak',length:3.6,beam:.7,mass:100,draft:.14,freeboard:.2,hullType:'v',drag:.65,lateral:1.15,windage:.3,wave:1.4,breakForce:4000,color:'#cfa259',manual:true}
};
export const fleetName=b=>b.name??TOWABLES[b.fleetKind]?.name??b.spec.name;
export function createFleetCraft(kind,options={}){
 if(!TOWABLES[kind])return createBoat('lake',{...options,profile:kind,coldStart:true});
 const p=TOWABLES[kind],defaultCrew=kind==='banana'?3:kind==='barge'?0:1,crewCount=clamp(options.crewCount??defaultCrew,0,12),hullMass=clamp(options.hullMass??p.mass-defaultCrew*75,5,8000),equipmentMass=clamp(options.equipmentMass??0,0,1500),mass=hullMass+crewCount*75+equipmentMass,length=clamp(options.length??p.length,1,15),beam=clamp(options.beam??p.beam,.5,5),b=createBoat('lake',{profile:'flat',coldStart:true,crewCount:0,equipmentMass:0});
 Object.assign(b.spec,{name:p.name,length,beam,hullMass,structureMass:hullMass,dryMass:mass,referenceMass:p.mass,referenceDraft:p.draft*p.length*p.beam/(length*beam),draft:p.draft,freeboard:p.freeboard,hullType:p.hullType,color:p.color,
  propulsion:'none',passive:true,manual:!!p.manual,sealed:!!p.sealed,inflatable:kind==='banana'||kind==='mat',powers:[0],fuelCapacity:0,crewCount,crewMass:crewCount*75,equipmentMass,planing:!!p.planing,planingThreshold:.65,waveResponse:p.wave,windageFactor:p.windage,propWalkStrength:0,bowThruster:false,sternThruster:false,
  towDragFactor:p.drag,lateralFactor:p.lateral,lineBreak:p.breakForce,lineEA:p.breakForce*9,wheelTurns:.5,steeringLockTime:.6});
 b.fleetKind=kind;b.fenders=kind==='barge'||kind==='rowboat';b.engines[0].hp=0;
 b.fuel.capacity=b.fuel.litres=b.fuel.flow=0;b.fuel.tanks=[];b.electrics.master=false;
 updateMass(b.spec,0);b.bilge=createBilge(b.spec);if(kind==='barge'){b.spec.anchorMass=24;b.spec.chain=12;}b.anchor=createAnchor(b.spec);return b;
}
export function fleetKinds(){return[...Object.entries(CRAFTS),...Object.entries(TOWABLES)];}
