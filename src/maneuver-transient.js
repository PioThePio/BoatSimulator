const clamp=x=>Math.max(0,Math.min(1,x));
// A propeller torque step unloads the stern's cross-flow resistance briefly.
// This only changes dissipative hull resistance; it cannot add thrust or energy.
export function sternPowerOnState(spec,engines,steer,speed,dt,previous={}){
 const supported=['outboard','zdrive','jet'].includes(spec.propulsion)&&!spec.passive;
 const lateral=supported?engines.reduce((sum,en)=>sum+Math.abs((en.effectiveThrust??en.thrust??0)*Math.sin(en.forceSteer??steer)),0):0;
 const rise=Math.max(0,(lateral-(previous.lateral??lateral))/Math.max(1e-6,dt));
 const memory=Math.max((previous.memory??0)*Math.exp(-dt/.75),clamp(rise/(Math.max(100,spec.mass)*2.2)));
 return{lateral,memory,release:supported?memory*clamp(1-(Math.abs(speed)/5)**2)**2*clamp(Math.abs(steer)/spec.maxSteer):0};
}
export function oarForces(spec,speed,command,steer){
 const effort=Math.max(-1,Math.min(1,command)),turn=Math.max(-1,Math.min(1,steer/spec.maxSteer));
 const thrust=effort*Math.min(90,85/Math.max(.8,Math.abs(speed))),common=thrust*(1-Math.abs(turn)),differential=thrust*turn;
 return{port:(common+differential)*.5,starboard:(common-differential)*.5,arm:spec.beam*.42};
}
