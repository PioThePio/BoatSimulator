import test from 'node:test';import assert from 'node:assert/strict';
import {createBoat} from '../src/physics.js';import {trafficStep} from '../src/traffic.js';import {buoyStep} from '../src/buoys.js';import {clearOfStaticSolids} from '../src/static-clearance.js';import {hullContactSamples} from '../src/hull-geometry.js';import {fenderGeometry,fenderContactShape} from '../src/fender-geometry.js';import {circleSolidHit,solidPoint} from '../src/solid-geometry.js';import {point} from '../src/rigging.js';import {SOLIDS,NIEPORET,DOCKS,bottomAt,setSlipAngle,SERVICE_STATION} from '../src/world.js';
const dt=1/120;
test('new Nieporęt buoys retain 20 Hz field sampling and 120 Hz inertia integration',()=>{
 const b=createBoat('nieporet'),q=b.buoys.find(q=>q?.site==='nieporet');b.buoys=[q];q.loadX=200;let prior,changes=0;for(let i=0;i<10;i++){b.time=(i+1)*dt;buoyStep(b,{windSpeed:3,currentSpeed:.2},dt);if(q.fieldCache!==prior){changes++;prior=q.fieldCache;}}assert.equal(changes,2);assert.ok(q.x!==q.homeX);assert.ok(Number.isFinite(q.heave));
});
test('zero-force mooring fast path matches the full solver and wakes for wind and a moving mooring point',()=>{
 const a=createBoat('nieporet'),b=createBoat('nieporet');a.traffic=[a.traffic.find(q=>q.site==='nieporet')];b.traffic=[b.traffic.find(q=>q.site==='nieporet')];
 for(let i=0;i<360;i++){const e=i<120?{traffic:true}:{traffic:true,windSpeed:6,currentSpeed:.3,waveHeight:.15};a.time=b.time=(i+1)*dt;b.traffic[0].restPose=null;trafficStep(a,e,dt);trafficStep(b,e,dt);for(const k of['x','y','a','vx','vy','w','heave','roll'])assert.ok(Math.abs(a.traffic[0][k]-b.traffic[0][k])<1e-12,k);}
 assert.ok(Math.hypot(a.traffic[0].vx,a.traffic[0].vy)>0);
 const c=createBoat('nieporet');c.traffic=[c.traffic.find(q=>q.site==='nieporet')];for(let i=0;i<20;i++){c.time+=dt;trafficStep(c,{traffic:true},dt);}const q=c.traffic[0],r=q.ropes.find(r=>c.buoys[r.bollard]);assert.ok(r);c.buoys[r.bollard].x+=.8;for(let i=0;i<8;i++){c.time+=dt;trafficStep(c,{traffic:true},dt);}assert.ok(q.ropes.some(r=>r.tension>0));
});
test('conservative static clearance never skips a real hull or fender contact after translation or rotation',()=>{
 const b=createBoat('lake'),samples=[...hullContactSamples(b.spec),...fenderGeometry(b.spec).flatMap(fenderContactShape)];
 for(const d of[DOCKS[1],...NIEPORET.docks.slice(0,3)])for(let i=0;i<40;i++){Object.assign(b,solidPoint(d,i*.07-1.4,1.5+i*.01),{a:(d.pose?.a??0)+i*.013});if(clearOfStaticSolids(b,SOLIDS))for(const p of samples)assert.ok(!SOLIDS.some(d=>circleSolidHit(point(b,p.x,p.y),p.radius,d)));}
});
test('cached bottom results cannot be mutated by callers and invalidate when the slip angle changes',()=>{
 const initial=SERVICE_STATION.slip.angle;try{const a=bottomAt(124,25),depth=a.depth;a.depth=999;assert.equal(bottomAt(124,25).depth,depth);setSlipAngle(initial+2);assert.notEqual(bottomAt(124,25).depth,depth);setSlipAngle(initial);assert.equal(bottomAt(124,25).depth,depth);}finally{setSlipAngle(initial);}
});
