import {clamp} from './world.js';
import {driveGeometry} from './drive.js';
// Null means the normal mechanically linked steering wheel. Optional independent
// targets use the same finite-rate actuator, force vector and rendered leg.
export function engineSteering(b,en,dt,bank=1){
 const target=Number.isFinite(en.steerTarget)?clamp(en.steerTarget,-b.spec.maxSteer,b.spec.maxSteer):b.actualSteer;
 if(Number.isFinite(en.steerTarget))en.steerAngle=(en.steerAngle??b.actualSteer)+clamp(target-(en.steerAngle??b.actualSteer),-.8*dt,.8*dt);
 else en.steerAngle=b.actualSteer;
 return en.steerAngle*bank;
}
export function driveWaterState(b,en,index=0){
 const S=b.spec,g=en.drive??driveGeometry(b,en),steer=en.forceSteer??en.steerAngle??b.actualSteer;
 const angle=S.propulsion==='inboard'?0:-steer,side=S.engineCount===2?Math.sign(en.y):1;
 const cooling=!S.air&&en.key==='running'&&!b.sunken&&en.immersion>.01?clamp(en.cooling??0,0,1):0;
 const thrust=en.effectiveThrust??en.thrust,active=!S.air&&en.key==='running'&&en.gear&&en.immersion>.01&&!b.sunken;
 const magnitude=active?Math.abs(thrust):0,power=clamp(magnitude/6000,0,1.5),length=magnitude>5?.55+Math.sqrt(magnitude)*.075:0;
 return{index,angle,x:g.localX,y:en.y,direction:en.gear>0?-1:1,magnitude,power,length,
  width:.09+Math.sqrt(magnitude)*.004,opacity:magnitude>5?clamp(.17+Math.sqrt(magnitude)*.006,0,.78):0,
  cooling,coolingX:-S.length*.53,coolingY:S.engineCount===2&&S.propulsion!=='inboard'?en.y+side*.24:side*S.beam*.51,side};
}
