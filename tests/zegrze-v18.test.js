import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope} from '../src/physics.js';
import {WORLD,LAKE,BOLLARDS,DOCKS,BRIDGES,BRIDGE_SOLIDS,REMOTE_HARBORS,MAP_STARTS,FUEL_STATION,SERVICE_STATION,bottomAt,shoreAt,polygonShore,fromGeo,toGeo} from '../src/world.js';
import {fromAtlas,GEONAMES_LANDMARKS,WORLD_DISTANCE_SCALE} from '../src/zegrze.js';
import {mapProjection,vehicleLookAhead} from '../src/render.js';
import {serviceStatus,requestRepair} from '../src/service.js';
import {systemsStep,requestRefuel} from '../src/systems.js';
import {ropeLoadState} from '../src/rope-load.js';
import {createTowRig,selectCarGear} from '../src/towing.js';
const dt=1/120;
const run=(b,t)=>{for(let i=0;i<t*120;i++)step(b,{},dt);};

test('v20 compresses atlas and geographic distances to 70% while retaining physical boat dimensions',()=>{
 const a=fromAtlas(0,0),b=fromAtlas(75,0);assert.ok(Math.abs(Math.hypot(b.x-a.x,b.y-a.y)-1000*WORLD_DISTANCE_SCALE)<1e-8);
 const [serock,nieporet]=GEONAMES_LANDMARKS,metres=Math.hypot(serock.x-nieporet.x,serock.y-nieporet.y);
 assert.ok(metres>8800*WORLD_DISTANCE_SCALE&&metres<9400*WORLD_DISTANCE_SCALE);assert.ok(WORLD.right-WORLD.left>17000*WORLD_DISTANCE_SCALE);
 const boat=createBoat('lake');assert.equal(boat.spec.length,5.5);assert.ok((WORLD.right-WORLD.left)/boat.spec.length>3000*WORLD_DISTANCE_SCALE);
 const point=fromGeo(52.449444,21.033333),roundTrip=toGeo(point.x,point.y);assert.ok(Math.abs(roundTrip.latitude-52.449444)<1e-10&&Math.abs(roundTrip.longitude-21.033333)<1e-10);
});

test('exact indexed bank queries agree with winding-number containment across every arm, including land between arms',()=>{
 function reference(x,y){let winding=0,near=Infinity;
  for(let i=0;i<LAKE.length;i++){const a=LAKE[i],b=LAKE[(i+1)%LAKE.length],cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);if(a.y<=y&&b.y>y&&cross>0)winding++;if(a.y>y&&b.y<=y&&cross<0)winding--;
   const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));near=Math.min(near,Math.hypot(x-a.x-t*dx,y-a.y-t*dy));
  }return(winding?1:-1)*near;
 }
 for(let i=0;i<400;i++){const x=WORLD.left+((i*.61803398875)%1)*(WORLD.right-WORLD.left),y=WORLD.top+((i*.41421356237)%1)*(WORLD.bottom-WORLD.top);assert.ok(Math.abs(polygonShore(x,y).distance-reference(x,y))<1e-7);}
});

test('overview and minimap use equal axis scale; fit/click coordinates round-trip without stretching the reservoir',()=>{
 for(const [w,h]of [[240,160],[390,400],[1440,650]]){const p=mapProjection(w,h),s=mapProjection(w*2,h*2);assert.equal(s.scale,p.scale*2);const x=FUEL_STATION.x,y=FUEL_STATION.y,px=p.x+(x-WORLD.left)*p.scale,py=p.y+(y-WORLD.top)*p.scale;assert.ok(Math.abs(WORLD.left+(px-p.x)/p.scale-x)<1e-8);assert.ok(Math.abs(WORLD.top+(py-p.y)/p.scale-y)<1e-8);}
});

test('fuel pier is genuinely across the lake and all remote harbours have water-facing attachment points',()=>{
 assert.ok(Math.hypot(FUEL_STATION.x-80,FUEL_STATION.y-15)>2700*WORLD_DISTANCE_SCALE);
 for(const q of REMOTE_HARBORS){const points=BOLLARDS.filter(p=>Math.hypot(p.x-q.x,p.y-q.y)<q.length+10&&p.kind==='bollard');assert.ok(points.length>=2,q.name);assert.ok(points.some(p=>bottomAt(p.x,p.y).depth>.3),q.name);}
 for(const d of DOCKS.filter(q=>q.h>q.w&&q.x<100)){
  assert.ok(BOLLARDS.some(p=>Math.abs(p.x-d.x)<1e-8&&p.y>d.y&&p.y<d.y+d.h));assert.ok(BOLLARDS.some(p=>Math.abs(p.x-d.x-d.w)<1e-8&&p.y>d.y&&p.y<d.y+d.h));
 }
});

test('a bridge deck does not act as a full-width underwater wall, but its real pier transfers a collision impulse',()=>{
 const bridge=BRIDGES.find(q=>q.id==='wierzbica'),dx=bridge.b.x-bridge.a.x,dy=bridge.b.y-bridge.a.y;
 const b=createBoat('lake');Object.assign(b,{x:bridge.a.x+dx*.36,y:bridge.a.y+dy*.36,a:Math.atan2(dx,-dy),vx:-dy/Math.hypot(dx,dy),vy:dx/Math.hypot(dx,dy),enginesRaised:true});assert.ok(bottomAt(b.x,b.y).depth>1);run(b,1);assert.equal(b.damage,0);assert.equal(b.grounded,false);
 const pier=BRIDGE_SOLIDS.find(q=>q.id==='wierzbica-pier-1'),hit=createBoat('lake');Object.assign(hit,{x:pier.x-hit.spec.length*.5-.1,y:pier.y+pier.h/2,a:0,vx:1,enginesRaised:true});run(hit,.5);assert.ok(hit.damage>0);assert.equal(hit.lastImpact.target,pier.id);assert.ok(hit.vx<.2);
});

test('separate service pier can be reached and repairs an actually afloat damaged hull through completion',()=>{
 for(const profile of ['runabout','cabin','cruiser']){
  const b=createBoat('service',{profile,coldStart:true});assert.ok(bottomAt(b.x,b.y).depth>b.spec.draft+.5);assert.equal(b.towRig,undefined);
  const target=BOLLARDS.findIndex(q=>q.id==='SER22');assert.ok(attachRope(b,'bow',target).ok);b.damage=35;b.bottomDamage.bottomBow=20;b.engines[0].propDamage=25;
  assert.equal(serviceStatus(b).ok,true);assert.equal(requestRepair(b).ok,true);run(b,14);assert.equal(b.damage,0);assert.equal(b.engines[0].propDamage,0);assert.equal(b.service.active,false);assert.equal(b.grounded,false);
  assert.ok(b.x>=SERVICE_STATION.x&&b.x<SERVICE_STATION.x+SERVICE_STATION.w);
 }
});

test('repair rejects an unrelated mooring, running/ignition engines and departing the separate berth',()=>{
 const b=createBoat('service',{coldStart:true});b.damage=30;assert.equal(requestRepair(b).ok,false);attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22'));
 for(const key of ['ignition','running']){b.engines[0].key=key;assert.equal(requestRepair(b).ok,false);}b.engines[0].key='off';assert.equal(requestRepair(b).ok,true);b.x+=30;systemsStep(b,dt);assert.equal(b.service.active,false);
});

test('the opposite-shore fuel berth fills only when moored, stopped and switched off',()=>{
 const b=createBoat('fuel',{coldStart:true});b.fuel.litres=20;assert.equal(requestRefuel(b).ok,false);assert.ok(attachRope(b,'bow').ok);assert.ok(requestRefuel(b).ok);systemsStep(b,1);assert.ok(b.fuel.litres>20);
 b.engines[0].key='ignition';systemsStep(b,1);assert.equal(b.fuel.refueling,false);
});

test('AUTO float reads physical litres immediately, catches a small flood before 20%, drains it and releases at the lower float',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.bilge;q.litres=q.autoOnLitres-.01;systemsStep(b,dt);assert.equal(q.running,false);
 q.litres=q.autoOnLitres+.1;q.level=0;const mass=b.spec.mass;systemsStep(b,dt);assert.equal(q.running,true);assert.equal(q.manual,false);assert.ok(q.level<.05);assert.ok(b.spec.mass>mass);
 for(let i=0;i<120*40;i++)systemsStep(b,dt);assert.equal(q.running,false);assert.ok(q.litres<=q.autoOffLitres);assert.ok(b.spec.mass<mass+q.autoOffLitres+.01);
});

test('AUTO does not conceal a leak larger than pump output, and a flat battery genuinely stops pumping',()=>{
 const b=createBoat('lake',{coldStart:true}),q=b.bilge;b.damage=60;b.bottomDamage.bottomStern=30;q.litres=q.autoOnLitres+1;systemsStep(b,1);assert.equal(q.running,true);assert.ok(q.inflow>q.outflow);
 b.battery.soc=0;systemsStep(b,dt);assert.equal(q.running,false);assert.equal(q.outflow,0);
});

test('mooring colours represent actual rope load, consistently independent of the selected bollard',()=>{
 const S=createBoat('lake').spec;
 for(const [tension,tone]of [[0,'slack'],[S.lineBreak*.05,'taut'],[S.lineBreak*.35,'loaded'],[S.lineBreak*.85,'danger']]){const q=ropeLoadState({tension},S);assert.equal(q.tone,tone);assert.ok(q.percent>=0&&q.percent<=100);}
});

test('45 degree low-speed steering makes a tighter real arc than 35 degrees and the same lock widens its arc as speed rises',()=>{
 const cases=[35,45].map(steeringLimit=>{const b=createBoat('lake',{steeringLimit,powers:[150]});b.steer=b.spec.maxSteer;b.throttle=.08;for(let i=0;i<720;i++){step(b,{},dt);b.x=80;b.y=110;}return b;});
 const radius=b=>Math.hypot(b.vx,b.vy)/Math.abs(b.w);assert.ok(radius(cases[1])<radius(cases[0])*.9);assert.ok(cases[1].w>cases[0].w*1.1);
 const b=cases[1],creep=radius(b);b.throttle=.5;for(let i=0;i<1440;i++){step(b,{},dt);b.x=80;b.y=110;}assert.ok(radius(b)>creep*1.5);assert.ok(b.telemetry.surge>2&&Math.abs(b.w)<1);
 assert.equal(createBoat('lake').spec.maxSteer,Math.PI/4);assert.equal(createBoat('lake',{profile:'pwc'}).spec.maxSteer,28*Math.PI/180);
});

test('SUV camera looks behind in reverse, ahead in drive, retains direction in P/N and preserves metre zoom',()=>{
 const b=createBoat('lake'),r=createTowRig(b);selectCarGear(r,'R');assert.equal(vehicleLookAhead(r),-1.5);selectCarGear(r,'N');assert.equal(vehicleLookAhead(r),-1.5);selectCarGear(r,'D');assert.equal(vehicleLookAhead(r),1.5);selectCarGear(r,'P');assert.equal(vehicleLookAhead(r),1.5);r.gear='D';r.car.vx=8;assert.equal(vehicleLookAhead(r),1.5);
});
