const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function shaftRudderForce(S,u,v,yaw,delta,thrust,y=0){
 const area=clamp(S.length*S.draft*.07,.18,.55);
 // Forward prop wash reaches the rudder. Astern, water must actually flow
 // past it; rotating the wheel at rest cannot supply reverse thrust steering.
 const wash=thrust>0?Math.sqrt(thrust/(.5*1000*.18))*.60*Math.sqrt(.16/area):0;
 const axial=u-yaw*y+wash,lateral=v+yaw*S.rudderLever,side=axial*Math.sin(delta)+lateral*Math.cos(delta);
 const stall=1+Math.abs(side)/Math.max(.5,Math.abs(axial));
 const normal=-.5*1000*area*Math.hypot(axial,lateral)*side/stall;
 return{x:normal*Math.sin(delta),y:normal*Math.cos(delta),area,wash};
}
