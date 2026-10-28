import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope} from '../src/physics.js';
import {CRAFTS,specification,engineKey} from '../src/craft.js';
import {BOLLARDS,DOCKS,ISLAND,LAKE,bottomAt} from '../src/world.js';
import {requestRepair,serviceStatus,isServicePoint} from '../src/service.js';
import {recordImpact} from '../src/impacts.js';
import {createTowRig,towStep,trailerContact,trailerAction,securingStatus,trailerImmersion,selectCarGear} from '../src/towing.js';
import {bodyPoint,bodyLocal} from '../src/tow-geometry.js';
import {connectWinch} from '../src/trailer-winch.js';
import {systemsStep} from '../src/systems.js';
import {towView,vehicleLookAhead,minimapProjection} from '../src/camera.js';
import {driveGeometry} from '../src/drive.js';
import {propSurfaceIntensity,coolingWaterIntensity} from '../src/render.js';
import {placeMapLabels} from '../src/map-labels.js';
const dt=1/120;
function swim(b,t,e={}){for(let i=0;i<t*120;i++)step(b,e,dt);return b;}
function tow(r,b,t,e={}){for(let i=0;i<t*120;i++){towStep(r,b,dt);step(b,e,dt);trailerContact(r,b,dt);}}

test('repair moved from both slip piers to the dedicated technical quay and buoys',()=>{
 for(const [x,id]of [[121,'R2L'],[129.25,'R2P']]){const b=createBoat('service',{coldStart:true});Object.assign(b,{x,y:22});attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id===id));assert.equal(serviceStatus(b).ok,false);}
 const b=createBoat('service',{coldStart:true});assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22')).ok);assert.ok(serviceStatus(b).ok);b.damage=25;b.engines[0].propDamage=18;assert.ok(requestRepair(b).ok);swim(b,12);assert.equal(b.damage,0);assert.equal(b.engines[0].propDamage,0);
 for(const p of BOLLARDS.filter(p=>/^R[123][LP]$/.test(p.id)))assert.equal(isServicePoint(p),false);
});
test('technical service rejects unrelated lines, running ignition, motion and leaving the berth',()=>{
 const b=createBoat('berth',{coldStart:true});attachRope(b,'bow');assert.equal(serviceStatus(b).ok,false);
 Object.assign(b,{...createBoat('service',{coldStart:true}),ropes:[]});attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22'));b.engines[0].key='ignition';assert.match(serviceStatus(b).message,/zapłon/);b.engines[0].key='off';b.vx=.6;assert.equal(serviceStatus(b).ok,false);b.vx=0;b.x=240;assert.equal(serviceStatus(b).ok,false);
});
test('continuous low-energy pressure cannot charge the same contact repeatedly or disable propulsion',()=>{
 const b=createBoat('lake');const hit={arm:{x:0,y:1},speed:.6,effective:b.spec.mass*.5,target:'narrow-berth'};
 recordImpact(b,hit);const damage=b.damage;assert.ok(damage>0&&damage<2);
 for(let i=0;i<3600;i++){b.time+=dt;recordImpact(b,hit);}assert.equal(b.damage,damage);assert.ok(b.damage<2);b.throttle=.3;swim(b,1);assert.ok(b.engines[0].thrust>0);
 b.time+=1;recordImpact(b,{...hit,speed:5});assert.ok(b.damage>damage+25);
});
test('slow real movement between an occupied berth and a pier does not turn a squeeze into instant total damage',()=>{
 const b=createBoat('lake');Object.assign(b,{x:33.1,y:23,a:-Math.PI/2,vy:-.4});b.throttle=.08;swim(b,18,{traffic:true});assert.ok(b.damage<25,b.damage);assert.equal(b.engines[0].key,'running');assert.ok(b.throttle>0);for(const k of ['x','y','vx','vy','w'])assert.ok(Number.isFinite(b[k]));
});
test('the new default loading depth keeps front tyres dry and rear tyres only partly submerged, with supports in the water',()=>{
 for(const profile of ['tender','runabout','cabin','cruiser','rib']){const b=createBoat('retrieve',{profile,coldStart:true}),r=createTowRig(b,{atSlip:true}),d=trailerImmersion(r,b);assert.equal(d.frontDepth,0,profile);assert.ok(d.rearDepth>.08&&d.rearDepth<.25,profile);assert.ok(d.bunkDepth>0,profile);assert.equal(d.tooDeep,false);}
});
test('the whole new shallow-start cycle loads through contact/winch, pulls onto dry supports and then accepts straps',()=>{
 const b=createBoat('retrieve',{coldStart:true}),r=createTowRig(b,{atSlip:true}),p=bodyPoint(r.trailer,r.trailer.offset-.8,.16);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a+.04});b.engines[0].trim=b.engines[0].trimTarget=1;
 assert.ok(connectWinch(r,b).ok);assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.trailer)).ok);r.winch.control=-1;tow(r,b,14);
 let local=bodyLocal(r.trailer,b);assert.ok(Math.abs(local.y)<.15);assert.ok(Math.abs(local.x-r.trailer.offset)<.12);assert.ok(b.trailerSupport.load>100);assert.equal(b.damage,0);r.winch.control=0;
 r.engine.key='running';r.awd=true;r.gear='D';r.gas=.45;for(let i=0;i<2400&&r.car.y>-4;i++)tow(r,b,dt);r.gas=0;r.brake=1;tow(r,b,2);selectCarGear(r,'P');
 assert.ok(r.car.y<4,r.car.y);assert.ok(b.trailerSupport.kg>b.spec.mass*.7);local=bodyLocal(r.trailer,b);assert.ok(Math.abs(local.y)<.25);assert.ok(securingStatus(r,b).ok,securingStatus(r,b).message);const pose={x:b.x,y:b.y,a:b.a};assert.ok(trailerAction(r,b,'secure').ok);assert.ok(Math.hypot(b.x-pose.x,b.y-pose.y)<1e-8);assert.equal(b.a,pose.a);assert.equal(b.damage,0);assert.equal(r.loadingScore.complete,true);
});
test('grossly skewed or distant boats cannot be secured merely because the winch is attached',()=>{
 const b=createBoat('retrieve',{coldStart:true}),r=createTowRig(b,{atSlip:true}),p=bodyPoint(r.trailer,r.trailer.offset,1.0);Object.assign(b,{x:p.x,y:p.y,a:r.trailer.a+.5});r.winch.attached=true;assert.equal(securingStatus(r,b).ok,false);assert.equal(trailerAction(r,b,'secure').ok,false);
});
test('R and D make a small, speed-independent camera shift and every corner of the articulated rig remains visible',()=>{
 for(const width of [320,390,800,1153])for(const angle of [-.8,0,.8])for(const profile of ['runabout','cruiser']){
  const b=createBoat('lake',{profile}),r=createTowRig(b,{loaded:true});r.trailer.a+=angle;const requested=Math.min(width/140,450/80)*3;const scales=[];
  for(const gear of ['R','N','D']){r.gear=gear;const view=towView(r,b,width,450,requested);scales.push(view.scale);for(const p of view.points){const x=width/2+(p.x-view.camera.x)*view.scale,y=225+(p.y-view.camera.y)*view.scale;assert.ok(x>=view.padding-.01&&x<=width-view.padding+.01);assert.ok(y>=view.padding-.01&&y<=450-view.padding+.01);}
   const lead=vehicleLookAhead(r);r.car.vx=15;assert.equal(vehicleLookAhead(r),lead);r.car.vx=0;
  }assert.equal(scales[0],scales[1]);assert.equal(scales[1],scales[2]);
 }
});
test('boat speed zoom genuinely widens and then returns smoothly without changing the user zoom',()=>{
 const b=createBoat('lake');b.vx=11;const initial=b.cameraZoom;for(let i=0;i<360;i++){step(b,{},dt);b.vx=11;b.x=80;b.y=110;}assert.ok(b.cameraZoom<initial*.72);const wide=b.cameraZoom;b.vx=b.vy=b.w=0;swim(b,5);assert.ok(b.cameraZoom>wide+.2&&b.cameraZoom<1);
});
test('flood water has mass, progressively immerses the real hull, stalls the engine and permits complete submergence',()=>{
 const b=createBoat('lake');b.bilge.auto=false;b.bilge.litres=b.bilge.capacity;const mass=b.spec.mass;swim(b,12);assert.ok(b.spec.mass>mass+500);assert.ok(b.heave<-b.spec.freeboard);assert.equal(b.sunken,true);assert.ok(b.submersion>.9);assert.equal(b.engines[0].key,'off');assert.equal(b.battery.voltage,0);assert.equal(b.electrics.floodFault,true);assert.equal(b.engines[0].rpm,0);assert.equal(b.engines[0].thrust,0);assert.equal(engineKey(b,0,'start').ok,true);assert.equal(b.engines[0].rpm,0);assert.equal(b.battery.voltage,0);
 // A serviced replacement supply is required after the new latched flood short.
 b.electrics.floodFault=false;b.electrics.master=true;b.battery.soc=1;b.battery.voltage=12.75;b.bilge.manual=true;for(let i=0;i<1800;i++)systemsStep(b,1);swim(b,12);assert.ok(b.bilge.litres<1);assert.ok(Math.abs(b.spec.mass-mass)<1);assert.ok(Math.abs(b.heave)<.05);assert.equal(b.sunken,false);
});
test('a full-lock swamp boat rotates from rest within its own length, while a moderate lock still drives forward and slides',()=>{
 const b=createBoat('lake',{profile:'swamp'});b.throttle=1;b.steer=b.spec.maxSteer;swim(b,4.5);assert.ok(b.a>Math.PI/2,b.a);assert.ok(Math.hypot(b.x-80,b.y-110)<b.spec.length);assert.ok(b.engines[0].thrust>2000);const speed=Math.hypot(b.vx,b.vy),direction=Math.atan2(b.vy,b.vx);b.throttle=0;swim(b,.5);assert.ok(Math.hypot(b.vx,b.vy)>speed*.75);assert.ok(Math.abs(Math.atan2(b.vy,b.vx)-direction)<.2);
 const m=createBoat('lake',{profile:'swamp'});m.throttle=1;m.steer=.5;for(let i=0;i<2400;i++){step(m,{},dt);m.x=80;m.y=110;}assert.ok(m.telemetry.surge>1.5&&Math.abs(m.telemetry.sway)>1.5);
});
test('a flooded engine can be serviced after pumping out even when propeller and hull damage are zero',()=>{
 const b=createBoat('service',{coldStart:true});b.engines[0].flooded=true;assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22')).ok);assert.ok(requestRepair(b).ok);swim(b,2);assert.equal(b.engines[0].flooded,true);swim(b,5);assert.equal(b.service.active,false);assert.equal(b.engines[0].flooded,false);assert.ok(engineKey(b,0,'ignition').ok);assert.ok(engineKey(b,0,'start').ok);
});
test('propulsion choices and steering angles belong to the craft, with the fixed shaft propeller under the stern',()=>{
 const choices={tender:['outboard'],runabout:['outboard','zdrive'],cabin:['outboard','zdrive','inboard'],cruiser:['inboard'],pwc:['jet'],flat:['outboard'],rib:['outboard'],swamp:['air']};
 for(const [profile,allowed]of Object.entries(choices)){assert.deepEqual(CRAFTS[profile].propulsions,allowed);for(const propulsion of ['outboard','inboard','zdrive','jet','air']){const S=specification({profile,propulsion});assert.ok(allowed.includes(S.propulsion));assert.equal(S.maxSteer,(profile==='pwc'?28:45)*Math.PI/180);}}
 const b=createBoat('lake',{profile:'cabin',propulsion:'inboard'}),g=driveGeometry(b,b.engines[0]);assert.ok(g.localX>-.5*b.spec.length);assert.ok(b.spec.rudderLever<-.5*b.spec.length);
});
test('idle has cooling discharge without prop bubbles; disturbed flow foams only while the wet propeller is working',()=>{
 const b=createBoat('lake'),en=b.engines[0];swim(b,2);assert.equal(propSurfaceIntensity(b,en),0);assert.ok(coolingWaterIntensity(b,en)>0);b.throttle=1;swim(b,2);assert.ok(propSurfaceIntensity(b,en)>.05);swim(b,12);assert.ok(propSurfaceIntensity(b,en)<.01);en.opposingFlow=4;assert.ok(propSurfaceIntensity(b,en)>.4);en.key='off';assert.equal(propSurfaceIntensity(b,en),0);assert.equal(coolingWaterIntensity(b,en),0);en.key='running';en.immersion=0;assert.equal(propSurfaceIntensity(b,en),0);assert.equal(coolingWaterIntensity(b,en),0);
});
test('island starts are afloat with propeller clearance for every craft instead of resting on yellow sand',()=>{
 for(const profile of Object.keys(CRAFTS)){const b=createBoat('island',{profile,coldStart:true});swim(b,2);assert.ok(bottomAt(b.x,b.y).depth>b.spec.draft+.5,profile);assert.equal(b.grounded,false,profile);assert.ok(driveGeometry(b,b.engines[0]).clearance>.5,profile);}
 assert.ok(LAKE.length>500);
});
test('local minimap covers 3.5 km with reversible pointer coordinates and a visible boat marker at its centre',()=>{
 const b=createBoat('lake'),p=minimapProjection(240,160,b);assert.ok(p.worldWidth<3600);const x=(b.x-p.left)*p.scale,y=(b.y-p.top)*p.scale;assert.ok(Math.abs(x-120)<1e-6&&Math.abs(y-80)<1e-6);assert.ok(Math.abs(p.left+x/p.scale-b.x)<1e-8);
});
test('map labels fit the viewport and neither overlap one another nor the reserved cockpit overlays',()=>{
 const blocked=[{x:0,y:0,w:400,h:80}],labels=placeMapLabels(Array.from({length:12},(_,i)=>({x:200+i,y:180,text:'Przystań '+i,priority:i===0?5:1})),t=>t.length*6,400,300,blocked);assert.ok(labels.length>=3);for(let i=0;i<labels.length;i++){const a=labels[i];assert.ok(a.y>=80);for(const b of labels.slice(i+1))assert.ok(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y);}
});
