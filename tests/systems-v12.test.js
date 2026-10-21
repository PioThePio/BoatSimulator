import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step,attachRope,BOLLARDS} from '../src/physics.js';
import {propellerContact} from '../src/ground.js';
import {recordImpact,impactPaint,damageColor} from '../src/impacts.js';
import {requestRepair,serviceStatus} from '../src/service.js';
import {soundParameters} from '../src/sound.js';
import {updateEngine} from '../src/craft.js';
import {BUILDINGS,bottomAt,SERVICE_STATION} from '../src/world.js';
import {driveGeometry} from '../src/drive.js';
const run=(b,seconds)=>{for(let i=0;i<seconds*120;i++)step(b,{},1/120);};

function beach(speed=.25,rock=false){const b=createBoat('open');Object.assign(b,rock?{x:80,y:7.1,a:-Math.PI/2,vx:0,vy:-speed}:{x:9.3,y:150,a:Math.PI,vx:-speed,vy:0});b.enginesRaised=true;run(b,2);return b;}
test('gentle bow grounding in sand supports the boat without damage or a false side-impact indication',()=>{
 const b=beach();assert.ok(b.grounded);assert.equal(b.damage,0);assert.deepEqual(b.sectionDamage,{});assert.equal(b.lastImpact.zone,'bottomBow');assert.equal(b.lastImpact.kind,'gentle');
 assert.equal(b.bottomDamage.bottomMid??0,0);assert.equal(b.bottomDamage.bottomStern??0,0);assert.equal(impactPaint(b,'bow').color,null);b.time+=2;assert.equal(impactPaint(b,'bottomBow').color,null);
});
test('rocky grounding and higher impact speed harm actual bottom sections without colouring the side perimeter',()=>{
 const light=beach(.45,true),hard=beach(3.5,true);assert.ok(light.damage>0&&light.damage<2);assert.ok(hard.damage>light.damage*10);assert.ok(hard.bottomDamage.bottomBow>0);assert.deepEqual(hard.sectionDamage,{});
});
test('the three bottom regions and side impacts retain separate damage, with graded persistent colours',()=>{
 const b=createBoat('lake');b.a=0;
 for(const [x,damage,zone]of [[2,2,'bottomBow'],[0,20,'bottomMid'],[-2,70,'bottomStern']]){recordImpact(b,{arm:{x,y:0},speed:.5,effective:500,target:'bottom',dock:false,damage});assert.equal(b.bottomDamage[zone],damage);}
 assert.deepEqual(b.sectionDamage,{});b.time+=2;
 assert.equal(impactPaint(b,'bottomBow').color,'#d8c36c');assert.equal(impactPaint(b,'bottomMid').color,'#df9c54');assert.equal(impactPaint(b,'bottomStern').color,'#bf6350');assert.equal(impactPaint(b,'bow').color,null);assert.equal(damageColor(0),null);
});
test('the first moving sand scuff is slight but visible; stone contact is much more severe, each prop independent',()=>{
 const sample=(x,y)=>{const b=createBoat('lake');Object.assign(b,{x,y,a:0,vx:.2});const en=b.engines[0];en.gear=1;en.n=.3;propellerContact(b,en,1/120,()=>{});return en;};
 const sand=sample(10.5,150),rock=sample(80,6.4);assert.ok(sand.propDamage>0&&sand.propDamage<1);assert.ok(rock.propDamage>sand.propDamage*10);assert.equal(damageColor(sand.propDamage),'#d8c36c');
});
test('trim pump sound follows physical travel and stops at the detent, and a PWC has no trim motor sound',()=>{
 const b=createBoat('lake'),en=b.engines[0];en.trimTarget=.15;updateEngine(en,0,0,1/120);assert.ok(soundParameters(b).trimPump>0);for(let i=0;i<100;i++)updateEngine(en,0,0,1/120);assert.equal(soundParameters(b).trimPump,0);
 const jet=createBoat('lake',{profile:'pwc'});jet.engines[0].trimRate=.1;assert.equal(soundParameters(jet).trimPump,0);
});
function workshop(){const b=createBoat('service',{coldStart:true});assert.ok(attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='R2L')).ok);b.damage=42;b.sectionDamage.portMid=12;b.bottomDamage.bottomBow=30;b.engines[0].propDamage=28;b.dockDamage=16;return b;}
test('service requires its own berth, a line, stillness and all ignition off',()=>{
 const b=workshop();assert.ok(serviceStatus(b).ok);b.engines[0].key='ignition';assert.match(requestRepair(b).message,/zapłon/);b.engines[0].key='off';b.vx=.2;assert.equal(requestRepair(b).ok,false);b.vx=0;
 const ropes=b.ropes;b.ropes=[];assert.match(requestRepair(b).message,/Przycumuj/);b.ropes=ropes;b.x=54;b.y=20;assert.equal(requestRepair(b).ok,false);
});
test('repair takes time, restores the boat and prop without teleporting, and does not fix the dock',()=>{
 const b=workshop(),position=[b.x,b.y];assert.ok(requestRepair(b).ok);run(b,2);assert.ok(b.damage>0&&b.damage<42);assert.ok(b.engines[0].propDamage>0&&b.engines[0].propDamage<28);assert.ok(b.service.active);
 run(b,20);assert.equal(b.damage,0);assert.equal(b.engines[0].propDamage,0);assert.deepEqual(b.sectionDamage,{});assert.deepEqual(b.bottomDamage,{});assert.deepEqual([b.x,b.y],position);assert.equal(b.dockDamage,16);assert.equal(b.service.progress,1);assert.equal(b.service.active,false);
});
test('untying or turning ignition on interrupts repair immediately without silently continuing the work',()=>{
 for(const release of [b=>b.ropes=[],b=>b.engines[0].key='ignition']){const b=workshop();requestRepair(b);run(b,1);release(b);step(b,{},1/120);const damage=b.damage;assert.equal(b.service.active,false);run(b,1);assert.equal(b.damage,damage);assert.match(b.service.status,/przerwana/);}
});
test('the new settlement is on dry land and the service start is afloat between its two piers',()=>{
 for(const house of BUILDINGS)for(const [x,y]of [[house.x,house.y],[house.x+house.w,house.y+house.h]])assert.ok(bottomAt(x,y).land);
 for(const profile of ['tender','runabout','cabin','cruiser','pwc']){const b=createBoat('service',{profile});assert.ok(bottomAt(b.x,b.y).depth>b.spec.draft+.5);assert.ok(driveGeometry(b,b.engines[0]).clearance>.3);assert.ok(b.x>SERVICE_STATION.x&&b.x<SERVICE_STATION.x+SERVICE_STATION.w);}
});
