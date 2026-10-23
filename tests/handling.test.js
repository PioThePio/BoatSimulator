import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,cleat,bottomAt,environment,waveAt,BOLLARDS} from '../src/physics.js';
import {updateEngine,engineState} from '../src/craft.js';
import {requestHaul,anchorCommand,catenary,anchorProfile} from '../src/rigging.js';
const calm={windSpeed:0,currentSpeed:0,waveHeight:0,autoWaves:false};
function run(b,t,e=calm,free=false){for(let i=0;i<t*120;i++){step(b,e,1/120);if(free){b.x=64;b.y=48;}}return b;}
function kinetic(b){const c=Math.cos(b.a),s=Math.sin(b.a),u=b.vx*c+b.vy*s,v=-b.vx*s+b.vy*c;return .5*(b.spec.mx*u*u+b.spec.my*v*v+b.spec.iz*b.w*b.w);}
test('shaft spools up, gear reversal passes through neutral and power limits hold',()=>{
 const en=engineState(60);updateEngine(en,1,0,.1);assert.equal(en.thrust,0);
 for(let i=0;i<360;i++)updateEngine(en,1,4,1/120);assert.ok(en.n>.8);const ahead=en.thrust;assert.ok(ahead>1000);
 updateEngine(en,-1,4,.1);assert.equal(en.thrust,0);assert.notEqual(en.gear,-1);
 for(let i=0;i<240;i++)updateEngine(en,-1,4,1/120);assert.ok(en.thrust<0);assert.equal(en.gear,-1);
 for(const speed of [1,4,8,15]){updateEngine(en,-1,speed,1/120);assert.ok(Math.abs(en.thrust*speed)<=.55*60*735.5*en.n**3+1);}
});
test('added mass is anisotropic and dimensions change moment of inertia',()=>{
 const small=createBoat('open',{length:4}),long=createBoat('open',{length:9});assert.ok(small.spec.mx>small.spec.mass);assert.ok(small.spec.my>small.spec.mx);assert.ok(long.spec.iz>small.spec.iz*3);
});
test('same engine accelerates heavier hull more slowly',()=>{
 const light=createBoat('open',{hullMass:700,powers:[60]}),heavy=createBoat('open',{hullMass:2200,powers:[60]});light.a=heavy.a=0;light.throttle=heavy.throttle=.6;run(light,3,calm,true);run(heavy,3,calm,true);assert.ok(light.vx>heavy.vx*1.8);
});
test('reversing while underway initially coasts then brakes, no instantaneous velocity reversal',()=>{
 const b=createBoat('open');b.a=0;b.throttle=1;run(b,6,calm,true);const before=b.vx;b.throttle=-1;run(b,.3,calm,true);assert.ok(b.vx>0&&b.vx<before);assert.ok(b.engines[0].thrust===0);run(b,10,calm,true);assert.ok(b.vx<0);
});
test('counter-thrust twins yaw; equal ahead twins stay straight',()=>{
 const spin=createBoat('open',{engineCount:2,powers:[60,60]}),straight=createBoat('open',{engineCount:2,powers:[60,60]});spin.a=straight.a=0;spin.linked=false;spin.throttle=.6;spin.throttle2=-.6;straight.throttle=.6;run(spin,6,calm,true);run(straight,6,calm,true);assert.ok(spin.w>.04);assert.ok(Math.abs(straight.w)<1e-6);assert.ok(Math.hypot(spin.vx,spin.vy)<Math.hypot(straight.vx,straight.vy));
 const mirror=createBoat('open',{engineCount:2,powers:[60,60]});mirror.a=0;mirror.linked=false;mirror.throttle=-.6;mirror.throttle2=.6;run(mirror,6,calm,true);assert.ok(mirror.w<-.04);
});
test('tight fast turn dissipates more speed than a shallow turn or straight course',()=>{
 const boats=[0,.15,.5].map(angle=>{const b=createBoat('open');b.a=0;b.vx=8;b.throttle=.5;b.steer=angle;return run(b,5,calm,true);});
 const speeds=boats.map(b=>Math.hypot(b.vx,b.vy));assert.ok(speeds[0]>speeds[1]&&speeds[1]>speeds[2]);assert.ok(speeds[2]<speeds[0]*.91);assert.ok(Math.abs(boats[2].w)>Math.abs(boats[1].w)*2);
});
test('turning response is speed dependent and zero-thrust skeg reacts to water flow',()=>{
 const slow=createBoat('open'),fast=createBoat('open');slow.a=fast.a=0;slow.vx=.2;fast.vx=6;slow.steer=fast.steer=.4;run(slow,1,calm,true);run(fast,1,calm,true);assert.ok(Math.abs(fast.w)>Math.abs(slow.w)*3);assert.equal(fast.engines[0].thrust,0);
});
test('unpowered hull dissipates kinetic energy over multiple headings and yaw rates',()=>{
 for(const [u,v,w]of [[8,0,.4],[2,1,-.2],[-3,-.5,.2]]){const b=createBoat('open');b.a=0;b.vx=u;b.vy=v;b.w=w;const initial=kinetic(b);let max=initial;for(let i=0;i<1200;i++){step(b,calm,1/120);b.x=64;b.y=48;max=Math.max(max,kinetic(b));}assert.ok(max<=initial*1.001);assert.ok(kinetic(b)<initial*.6);}
});
test('moving with current and air has no spurious hydrodynamic acceleration',()=>{
 const b=createBoat('open');b.a=.8;b.vx=.6;run(b,4,{...calm,currentSpeed:.6,currentDirection:90,windSpeed:.6,windDirection:90},true);assert.ok(Math.abs(b.vx-.6)<1e-6);assert.ok(Math.abs(b.vy)<1e-6);
});
test('chosen bollard is respected and out-of-range selection fails without fallback',()=>{
 const b=createBoat('berth');assert.equal(attachRope(b,'bow',4).ok,true);assert.equal(b.ropes[0].bollard,4);const other=createBoat('berth');assert.equal(attachRope(other,'bow',0).ok,false);assert.equal(other.ropes.length,0);
});
test('hauling is gradual and limited by human effort, rather than jumping length',()=>{
 for(const profile of ['tender','cruiser']){const b=createBoat('berth',{profile});attachRope(b,'bow');const r=b.ropes[0],initial=r.length;requestHaul(r,-1);step(b,calm,1/120);assert.ok(initial-r.length<=.28/120+.00001);let maximum=0;for(let i=0;i<5*120;i++){step(b,calm,1/120);maximum=Math.max(maximum,r.tension);}assert.ok(maximum<460,`${profile}: ${maximum}`);assert.ok(Math.hypot(b.vx,b.vy)<.3);}
});
test('stiff mooring limits extension and external load does not become unlimited manual hauling',()=>{
 const b=createBoat('berth');attachRope(b,'bow');const r=b.ropes[0],p=cleat(b,'bow'),q=BOLLARDS[r.bollard];r.length=Math.hypot(p.x-q.x,p.y-q.y)-.02;r.targetLength=r.length;step(b,calm,1/120);assert.ok(r.tension>200);const initial=r.length;requestHaul(r,-.5);step(b,calm,1/120);assert.ok(initial-r.length<.0001);
});
test('bathymetry varies spatially and grounding slows boat',()=>{
 assert.ok(Math.abs(bottomAt(6,6).depth-bottomAt(64,48).depth)>3);assert.equal(bottomAt(500,200).material,'mud');const b=createBoat('open',{profile:'cruiser',hullMass:8000});b.x=8;b.y=4;b.a=0;b.vx=1;step(b,calm,1/120);assert.ok(b.grounded);run(b,1);assert.ok(Math.abs(b.vx)<.5);
});
test('wave-free rest is stable; waves physically drive bobbing and lateral motion',()=>{
 const rest=createBoat('berth'),waves=createBoat('berth');run(rest,10);let maxRoll=0,maxHeave=0,maxMotion=0;
 for(let i=0;i<10*120;i++){step(waves,{...calm,waveHeight:.35,waveDirection:90},1/120);maxRoll=Math.max(maxRoll,Math.abs(waves.roll));maxHeave=Math.max(maxHeave,Math.abs(waves.heave));maxMotion=Math.max(maxMotion,Math.hypot(waves.x-rest.x,waves.y-rest.y));}
 assert.equal(rest.heave,0);assert.equal(rest.roll,0);assert.ok(maxRoll>.01);assert.ok(maxHeave>.03);assert.ok(maxMotion>.01);
});
test('catenary goes from slack seabed contact to lifted taut chain with increasing load',()=>{
 const slack=catenary(8,4,20,8),mid=catenary(19,4,20,8),tight=catenary(20,4,20,8);
 assert.equal(slack.H,0);assert.ok(slack.laid>0);assert.ok(mid.H>slack.H);assert.ok(tight.H>mid.H);assert.equal(tight.laid,0);assert.ok(tight.V0>0);assert.ok(Math.abs(tight.z-4)<.001);assert.ok(Math.abs(tight.x-20)<.001);
});
test('anchor takes time to reach bottom and rode pays out at finite speed',()=>{
 const b=createBoat('open');anchorCommand(b,'lower',20);step(b,calm,1/120);assert.ok(b.anchor.length<.01);assert.ok(!b.anchor.broken);run(b,10);assert.ok(b.anchor.z<bottomAt(b.anchor.x,b.anchor.y).depth);run(b,35);assert.ok(Math.abs(b.anchor.length-20)<.01);assert.ok(Math.abs(b.anchor.z-bottomAt(b.anchor.x,b.anchor.y).depth)<.02);assert.ok(b.anchor.groundLength>0);assert.ok(anchorProfile(b.anchor,b).length>0);
});
test('short scope lifts chain and weakens holding compared with generous rode',()=>{
 const b=createBoat('open');const depth=bottomAt(64,48).depth;b.anchor={...b.anchor,mode:'holding',status:'Kotwica trzyma',x:64,y:48,z:depth,length:8,set:1};b.x=70;b.y=48;b.a=-Math.PI/2;
 const initial=b.anchor.x;run(b,1);assert.ok(b.anchor.dragged>0||b.anchor.broken||b.anchor.x>initial);assert.ok(b.anchor.set<1||b.anchor.broken);
});
test('electric windlass stops on overload and retrieves a vertical anchor',()=>{
 const b=createBoat('open');anchorCommand(b,'lower',10);run(b,24);anchorCommand(b,'raise');run(b,44);assert.equal(b.anchor.mode,'stowed');
 const heavy=createBoat('open');const depth=bottomAt(64,48).depth;heavy.anchor={...heavy.anchor,mode:'holding',x:64,y:48,z:depth,length:10,set:1};heavy.a=0;heavy.x=70;const before=heavy.anchor.length;anchorCommand(heavy,'raise');step(heavy,calm,1/120);step(heavy,calm,1/120);assert.ok(heavy.anchor.windlassBlocked||heavy.anchor.broken||heavy.anchor.length>=before-.005);
});
test('coupled stiff lines and waves stay finite across hull types',()=>{
 for(const profile of ['tender','runabout','cabin','cruiser']){const b=createBoat('berth',{profile,engineCount:2});attachRope(b,'bow',4);attachRope(b,'stern',5);run(b,30,{...calm,windSpeed:7,windDirection:90,waveHeight:.35,waveDirection:90});for(const key of ['x','y','a','vx','vy','w','heave','roll'])assert.ok(Number.isFinite(b[key]),profile+key);assert.ok(Math.hypot(b.vx,b.vy)<2);}
});
test('lower command with a shorter target never reels in instantaneously',()=>{
 const b=createBoat('open');anchorCommand(b,'lower',20);run(b,42);const initial=b.anchor.length;anchorCommand(b,'lower',5);step(b,calm,1/120);assert.ok(b.anchor.length>=initial);assert.equal(b.anchor.mode,'holding');
});
