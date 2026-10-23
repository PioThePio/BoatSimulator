import {WORLD_DISTANCE_SCALE} from './zegrze.js';

// Accounting only. Never pass this scale (or its time) to a physics integrator.
export const worldScale=WORLD_DISTANCE_SCALE;
export const operationalTimeScale=1/worldScale;
export const logicalDistance=metres=>metres/worldScale;
export const operationalSeconds=seconds=>seconds*operationalTimeScale;
export function createOperations(){return{started:false,physicalSeconds:0,seconds:0,physicalDistance:0,distance:0,fuelUsed:0,maxSpeed:0};}

export function operationsStep(stats,engines,velocity,dt,{travelling=true}={}){
 if(!(dt>0))return;
 const seconds=operationalSeconds(dt),speed=Math.hypot(velocity.vx,velocity.vy);
 for(const en of engines)if(en.key==='running')en.operatingHours=(en.operatingHours??0)+seconds/3600;
 if(travelling&&(speed>.10||engines.some(en=>en.key==='running')))stats.started=true;
 if(!stats.started||!travelling)return;
 stats.physicalSeconds+=dt;stats.seconds+=seconds;
 // Integrate velocity instead of differences in position: reset/teleport and
 // collision depenetration cannot produce fictitious kilometres.
 stats.physicalDistance+=speed*dt;stats.distance+=logicalDistance(speed*dt);
 stats.maxSpeed=Math.max(stats.maxSpeed,speed);
}
export function consumeOperatingFuel(fuel,engines,stats,dt){
 const running=engines.filter(en=>en.key==='running'),flow=running.reduce((sum,en)=>sum+Math.max(0,en.fuelFlow??0),0);
 fuel.flow=flow;
 const used=Math.min(fuel.litres,flow*operationalSeconds(dt)/3600);
 fuel.litres=Math.max(0,fuel.litres-used);stats.fuelUsed+=used;
 for(const en of running)en.fuelUsed=(en.fuelUsed??0)+(flow>0?used*Math.max(0,en.fuelFlow??0)/flow:0);
 return used;
}
