import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoat,step} from '../src/physics.js';
import {attachRope} from '../src/rigging.js';
import {BOLLARDS} from '../src/world.js';
import {alarmStatus,acknowledgeAlarms} from '../src/alarms.js';
import {electricalStep,setMainPower,loadedBatteryVoltage} from '../src/electrical.js';
import {operationalTimeScale} from '../src/operations.js';
import {soundParameters} from '../src/sound.js';
import {requestRepair,serviceStep,SERVICE_PUMP_LPM} from '../src/service.js';
import {systemsStep} from '../src/systems.js';
import {engineKey} from '../src/craft.js';
import {immersionReadings} from '../src/flood-systems.js';
import {snapshotSession,restoreSession} from '../src/session-save.js';
import {createFleet} from '../src/fleet.js';
import {messageSeverity} from '../src/map-messages.js';
const dt=1/120,calm={traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0},near=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} vs ${b}`);
const run=(b,t)=>{for(let i=0;i<t*120;i++)step(b,calm,dt);};
function flooded(){const b=createBoat('service',{coldStart:true});attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='SER22'));b.bilge.auto=false;b.bilge.litres=b.bilge.capacity;b.damage=40;b.engines[0].propDamage=90;b.bilge.driveLeak=.9;run(b,12);assert.ok(b.sunken&&b.electrics.floodFault);return b;}
test('every onboard alarm, including bilge, requires electrical power; the red fault condition remains meaningful without sound',()=>{
 const b=createBoat('lake',{coldStart:true});b.bilge.alarm=true;b.engines[0].key='ignition';b.engines[0].temperature=125;assert.ok(alarmStatus(b).critical);for(const key of['bilgeAlarm','temperatureAlarm','ignitionAlarm'])assert.equal(soundParameters(b)[key],true);
 setMainPower(b,false);for(const key of['bilgeAlarm','temperatureAlarm','ignitionAlarm'])assert.equal(soundParameters(b)[key],false);assert.equal(b.bilge.alarm,true);assert.equal(b.engines[0].key,'ignition');assert.equal(alarmStatus(b).lit,false);
 setMainPower(b,true);assert.equal(alarmStatus(b).bilgeAlarm,true);b.battery.soc=0;electricalStep(b,dt);assert.equal(alarmStatus(b).lit,false);
});
test('acknowledgement mutes current sources only, retains the warning lamp and re-arms on a new fault, escalation, recurrence or power cycle',()=>{
 const b=createBoat('lake',{coldStart:true});b.engines[0].key='ignition';assert.equal(alarmStatus(b).ignitionAlarm,true);acknowledgeAlarms(b);assert.equal(alarmStatus(b).ignitionAlarm,false);assert.equal(alarmStatus(b).lit,true);
 b.bilge.alarm=true;assert.equal(alarmStatus(b).bilgeAlarm,true);acknowledgeAlarms(b);assert.equal(alarmStatus(b).muted,true);b.bilge.alarm=false;alarmStatus(b);b.bilge.alarm=true;assert.equal(alarmStatus(b).muted,false);acknowledgeAlarms(b);
 b.engines[0].temperature=106;assert.equal(alarmStatus(b).temperatureAlarm,true);acknowledgeAlarms(b);b.engines[0].temperature=125;assert.equal(alarmStatus(b).temperatureAlarm,true);acknowledgeAlarms(b);setMainPower(b,false);setMainPower(b,true);assert.equal(alarmStatus(b).muted,false);
});
test('acknowledgement and the retained key position survive Continue without advancing the alarm clock',()=>{
 const b=createBoat('lake',{coldStart:true});b.engines[0].key='ignition';b.bilge.alarm=true;b.bilge.litres=b.bilge.capacity*.6;b.bilge.level=.6;acknowledgeAlarms(b);const r=restoreSession(snapshotSession({fleet:createFleet(b),env:calm}));assert.ok(r.ok);const q=r.session.fleet.boats[0];assert.equal(alarmStatus(q).muted,true);assert.equal(q.engines[0].key,'ignition');assert.equal(q.time,b.time);
});
test('battery charging and discharge integrate the 2x voyage time while amps, IR sag and pump volumes retain their physical values',()=>{
 const b=createBoat('lake',{coldStart:true});const before=b.battery.soc;electricalStep(b,60);near(b.battery.current,1.6);near(before-b.battery.soc,1.6*60*operationalTimeScale/3600/b.battery.capacity);near(b.battery.voltage,loadedBatteryVoltage(b.battery,1.6));assert.ok((before-b.battery.soc)*100>.06);
 b.engines[0].key='running';b.engines[0].rpm=3000;const old=b.battery.soc;electricalStep(b,60);assert.ok(b.battery.current<0);near(b.battery.soc-old,-b.battery.current*60*operationalTimeScale/3600/b.battery.capacity);
 const pump=createBoat('lake',{coldStart:true});pump.bilge.manual=true;pump.bilge.litres=100;pump.battery.voltage=12;systemsStep(pump,1);near(pump.bilge.litres,100-pump.bilge.pumpRate/60);const charge=pump.battery.soc;setMainPower(pump,false);electricalStep(pump,60);near(pump.battery.soc,charge);
});
test('full water-side repair drains a genuinely sunken boat with an external pump, refloats it and restores electrical/start capability without moving its mooring',()=>{
 const b=flooded(),pose={x:b.x,y:b.y,a:b.a},fuel=b.fuel.litres,ropes=b.ropes.map(r=>({...r}));assert.ok(requestRepair(b).ok);run(b,1);assert.ok(b.bilge.litres>500);assert.equal(b.electrics.master,false);assert.ok(b.service.pumpOutflow>0&&b.service.pumpOutflow<=SERVICE_PUMP_LPM/60);assert.equal(b.service.active,true);
 for(let i=0;i<120*150&&b.service.active;i++)step(b,calm,dt);assert.equal(b.service.active,false);assert.equal(b.service.progress,1);assert.equal(b.bilge.litres,0);assert.equal(b.bilge.alarm,false);assert.equal(b.electrics.floodFault,false);assert.equal(b.sunken,false);assert.equal(b.swamped,false);assert.ok(b.submersion<.01);assert.ok(Math.abs(b.heave)<.05);assert.equal(immersionReadings(b).below,false);assert.equal(b.damage,0);assert.equal(b.engines[0].propDamage,0);assert.equal(b.engines[0].flooded,false);assert.equal(soundParameters(b).bilgeAlarm,false);near(b.x,pose.x);near(b.y,pose.y);near(b.a,pose.a);near(b.fuel.litres,fuel);assert.equal(b.ropes.length,ropes.length);
 const saved=restoreSession(snapshotSession({fleet:createFleet(b),env:calm}));assert.ok(saved.ok);assert.equal(saved.session.fleet.boats[0].sunken,false);setMainPower(b,true);engineKey(b,0,'ignition');assert.ok(engineKey(b,0,'start').ok);run(b,2);assert.equal(b.engines[0].key,'running');assert.equal(b.electrics.floodFault,false);
});
test('a legacy already-repaired submerged boat still qualifies for drying; stopping service retains its actual water and support state',()=>{
 const b=flooded();b.damage=0;b.engines[0].propDamage=0;b.engines[0].flooded=false;b.bilge.driveLeak=0;assert.ok(requestRepair(b).ok);const water=b.bilge.litres,height=b.heave;serviceStep(b,1);near(b.bilge.litres,water-SERVICE_PUMP_LPM/60);near(b.heave,height);assert.equal(b.service.active,true);const left=b.bilge.litres;requestRepair(b);serviceStep(b,1);near(b.bilge.litres,left);assert.equal(b.service.pumpOutflow,0);assert.ok(requestRepair(b).ok);run(b,90);assert.equal(b.service.active,false);assert.equal(b.sunken,false);
});
test('an active partial service survives a save without resetting damage, water or its physical recovery work',()=>{
 const b=flooded();requestRepair(b);run(b,10);const q=restoreSession(snapshotSession({fleet:createFleet(b),env:calm}));assert.ok(q.ok);const r=q.session.fleet.boats[0];near(r.bilge.litres,b.bilge.litres);near(r.service.progress,b.service.progress);assert.equal(r.service.active,true);run(r,100);assert.equal(r.service.active,false);assert.equal(r.sunken,false);assert.equal(r.electrics.floodFault,false);
});
test('informational events and gentle contact are neutral; damage/failures are warnings and flooding/shorts are critical',()=>{
 for(const q of['Rozrusznik pracuje…','Zapłon włączony.','Silnik wyłączony.','Naprawa zakończona · łódź osuszona','Łagodny kontakt · odbijacz'])assert.equal(messageSeverity(q),'info',q);
 for(const q of['Uszkodzenie · rufa','Śruba dotyka dna','Brak chłodzenia · opuść napęd','Akumulator nie pozwala na rozruch.','Silnik przegrzany','Awaria napędu · odholuj jednostkę'])assert.equal(messageSeverity(q),'warning',q);
 for(const q of['UWAGA — WODA W ZĘZIE','ZWARCIE · zalana instalacja','ŁÓDŹ ZATOPIONA','Cuma zerwana'])assert.equal(messageSeverity(q),'critical',q);
});
