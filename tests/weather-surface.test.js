import test from 'node:test';
import assert from 'node:assert/strict';
import {windZone,windBounds} from '../src/wind-field.js';
import {weatherAt,environment,waveHeightAt,waveAt,waveDirection,NIEPORET} from '../src/world.js';
import {windMarkers,waveCrests,foamPatches} from '../src/surface-weather.js';
import {waveCurrent} from '../src/wave-current.js';
import {createBoat,step} from '../src/physics.js';
import {soundParameters} from '../src/sound.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {createFleet} from '../src/fleet.js';
const near=(a,b,eps=1e-9)=>assert.ok(Math.abs(a-b)<eps,`${a} vs ${b}`),angle=(a,b)=>((a-b+540)%360)-180;
const bounds={left:0,right:200,top:0,bottom:100},variable={windMin:6,windMax:10,windDirection:90,windDirectionVariation:30,spatialEffects:true};
test('steady wind remains exactly steady at every position; disabling spatial effects retains the original regional weather',()=>{
 for(const t of[0,3,60,150])for(const[x,y]of[[0,0],[40,110],[-400,2300]]){
  const fixed=weatherAt(t,{windSpeed:8,windDirection:270,spatialEffects:true},x,y);assert.equal(fixed.windSpeed,8);assert.equal(fixed.windDirection,270);
  assert.deepEqual(weatherAt(t,{...variable,spatialEffects:false},x,y),weatherAt(t,variable));
 }
 assert.deepEqual(windBounds({windSpeed:10,gusts:true}),{min:6,max:14});
});
test('advected wind zones differ spatially, stay in selected strength/direction ranges and have no hard cell or time discontinuities',()=>{
 let lo=Infinity,hi=-Infinity,minA=Infinity,maxA=-Infinity;
 for(let t=0;t<90;t+=3)for(let x=-500;x<500;x+=20){const q=weatherAt(t,variable,x,110);lo=Math.min(lo,q.windSpeed);hi=Math.max(hi,q.windSpeed);const d=angle(q.windDirection,90);minA=Math.min(minA,d);maxA=Math.max(maxA,d);assert.ok(q.windSpeed>=6&&q.windSpeed<=10);assert.ok(Math.abs(d)<=30);const adjacent=weatherAt(t+.001,variable,x+.001,110);assert.ok(Math.abs(adjacent.windSpeed-q.windSpeed)<.002);assert.ok(Math.abs(angle(adjacent.windDirection,q.windDirection))<.02);}
 assert.ok(hi-lo>2);assert.ok(maxA-minA>20);
 const base=windZone(4,80,110,90,8),later=windZone(14,80+base.nx*base.advection*10,110+base.ny*base.advection*10,90,8);near(later.strength,base.strength);near(later.direction,base.direction);
});
test('strength and direction variability remain independent, including wrap across north and zero wind',()=>{
 for(const t of[0,6,30])for(const x of[0,80,200]){
  near(weatherAt(t,{...variable,windMin:8,windMax:8},x,110).windSpeed,8);
  near(weatherAt(t,{...variable,windDirectionVariation:0},x,110).windDirection,90);
  const q=weatherAt(t,{...variable,windDirection:359},x,110);assert.ok(Math.abs(angle(q.windDirection,359))<=30);
  assert.equal(weatherAt(t,{windSpeed:0,windDirectionVariation:90,spatialEffects:true},x,110).windSpeed,0);
 }
});
test('the same local wind reaches physical hull forces, live environment and wind audio without overriding velocity or yaw',()=>{
 const b=createBoat('lake',{profile:'cabin',coldStart:true});b.vx=1.2;b.vy=.25;b.w=.03;const before={x:b.x,y:b.y,vx:b.vx,vy:b.vy,w:b.w};
 const local=weatherAt(0,variable,b.x,b.y),flow=environment(0,variable,b.x,b.y);near(Math.hypot(flow.wind.x,flow.wind.y),local.windSpeed);near(soundParameters(b,variable).wind.level,local.windSpeed*.004);
 step(b,{...variable,traffic:false,autoWaves:false,waveHeight:0,currentSpeed:0},1/120);assert.ok(Math.hypot(b.vx-before.vx,b.vy-before.vy)<.02);assert.ok(Math.abs(b.w-before.w)<.01);assert.ok(b.vx>1&&b.vy>.2);assert.ok(Math.abs(b.x-before.x)<.02);
 const a=createBoat('lake',{profile:'cabin',coldStart:true}),c=createBoat('lake',{profile:'cabin',coldStart:true});c.x=200;a.a=c.a=-Math.PI/2;for(let i=0;i<120;i++)for(const q of[a,c])step(q,{...variable,traffic:false,autoWaves:false,waveHeight:0},1/120,{sharedStep:false});assert.ok(Math.hypot(a.vx-c.vx,a.vy-c.vy)>.002);
});
test('continuing a local save preserves the exact wind field phase without advancing physical time',()=>{
 const f=createFleet(createBoat('lake',{coldStart:true}));f.time=f.boats[0].time=42;const saved=restoreSession(snapshotSession({fleet:f,env:variable}));assert.ok(saved.ok);const s=saved.session;assert.deepEqual(weatherAt(42,s.env,80,110),weatherAt(42,variable,80,110));assert.equal(s.fleet.time,42);
});
test('wind arrow tails, heads and movement point along north/east/south/west airflow; strong wind has bounded short markers',()=>{
 for(const[x,y]of[[0,-8],[8,0],[0,8],[-8,0]]){const a=windMarkers(bounds,6,1,{windSpeed:8},()=>({x,y})),next=windMarkers(bounds,6,1.01,{windSpeed:8},()=>({x,y}));assert.ok(a.length>0&&a.length<=40);for(let i=0;i<a.length;i++){const m=a[i];near(m.dx,x/8);near(m.dy,y/8);assert.ok(m.length*6<=10);assert.ok((next[i].x-m.x)*m.dx+(next[i].y-m.y)*m.dy>0);}}
 const strong=windMarkers(bounds,6,1,{windSpeed:15},()=>({x:15,y:0}));assert.ok(strong.length<=40);assert.ok(strong.every(m=>m.opacity<=.38));assert.deepEqual(windMarkers(bounds,6,1,{windSpeed:15,windVisuals:false},()=>{throw Error('disabled');}),[]);assert.deepEqual(windMarkers(bounds,6,1,{windSpeed:0},()=>{throw Error('calm');}),[]);
});
test('wave crests are broad curved transverse fronts on the physical phase, separate from wind arrows and capped in whole-map detail',()=>{
 const spectrum=waveCurrent(2.8,3,.3),angle0=.4,c=waveCrests(bounds,6,3,angle0,spectrum,.25);assert.ok(c.length>0);for(const q of c){near(q.nx*q.tx+q.ny*q.ty,0);near(Math.sin(spectrum.k*(q.x*q.nx+q.y*q.ny)-spectrum.omega*3),0,1e-8);assert.ok(q.length>3&&q.length<=8);assert.ok(q.opacity<=.25);}
 assert.deepEqual(waveCrests(bounds,6,3,angle0,spectrum,0),[]);const overview=waveCrests({left:-6000,right:6000,top:-6000,bottom:6000},.06,3,angle0,spectrum,.4);assert.ok(overview.length<300);
});
test('whitecaps are finite fading clusters on some crests, not permanent dense streaks; disabling wind visuals removes them without erasing manual waves',()=>{
 const c=waveCrests(bounds,6,3,Math.PI/2,waveCurrent(2.8,3),.4),foam=foamPatches(c,3,.7,6);assert.ok(foam.length>0&&foam.length<=14);assert.ok(foam.every(q=>q.span<=2.2&&q.opacity<=.28));assert.deepEqual(foamPatches(c,3,0,6),[]);
 const later=foamPatches(c,3.5,.7,6);assert.notDeepEqual(later.map(q=>q.opacity),foam.map(q=>q.opacity));assert.ok(waveCrests(bounds,6,3,0,waveCurrent(2.8,3),.3).length>0);
});
test('wave height readout measures the same sheltered current-modified nominal spectrum, not instantaneous heave, and is zero on land',()=>{
 const e={waveHeight:.3,spatialEffects:false};near(waveHeightAt(80,110,0,e),.3,.0003);near(waveHeightAt(80,110,10,e),waveHeightAt(80,110,0,e));assert.notEqual(waveAt(80,110,0,e).eta,waveAt(80,110,1,e).eta);
 assert.ok(waveHeightAt(80,110,0,{...e,currentSpeed:.5,currentDirection:270,waveDirection:90})>waveHeightAt(80,110,0,{...e,currentSpeed:.5,currentDirection:90,waveDirection:90}));assert.equal(waveHeightAt(124,-30,0,e),0);
});
test('advected gusts do not rotate an established sea or create high-frequency phase jumps at distant ports',()=>{
 const e={...variable,autoWaves:true,currentMin:.1,currentMax:.8,currentDirection:270,currentDirectionVariation:30,spatialEffects:false},initial=waveDirection(e,0);
 for(let t=0;t<20;t+=.25){near(waveDirection(e,t),initial);const a=waveAt(NIEPORET.start.x,NIEPORET.start.y,t,e),b=waveAt(NIEPORET.start.x,NIEPORET.start.y,t+.001,e);assert.ok(Math.abs(b.eta-a.eta)/.001<2);}
});
