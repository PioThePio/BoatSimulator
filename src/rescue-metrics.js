// SI units and physical seconds. These measurements never change hull forces.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function rescueEngineState(b){
 const engines=b.engines.map((e,i)=>({key:e.key,gear:e.gear,command:i?b.throttle2:b.throttle}));
 return{engines,neutral:engines.every(e=>e.gear===0&&Math.abs(e.command??0)<.035),running:engines.filter(e=>e.key==='running').length};
}
export function rescueApproach(b,o){
 const dx=o.x-b.x,dy=o.y-b.y,c=Math.cos(b.a),s=Math.sin(b.a),x=dx*c+dy*s,y=-dx*s+dy*c;
 const px=clamp(x,-b.spec.length*.5,b.spec.length*.5),py=clamp(y,-b.spec.beam*.5,b.spec.beam*.5);
 const arm={x:c*px-s*py,y:s*px+c*py},point={x:b.x+arm.x,y:b.y+arm.y},rx=o.x-point.x,ry=o.y-point.y,distance=Math.hypot(rx,ry);
 const vx=b.vx-(b.w??0)*arm.y-o.vx,vy=b.vy+(b.w??0)*arm.x-o.vy;
 return{distance,centreDistance:Math.hypot(dx,dy),relativeSpeed:Math.hypot(vx,vy),closingSpeed:distance>.001?(vx*rx+vy*ry)/distance:0,point,...rescueEngineState(b)};
}
export function rescueContactMeasurement(b,o,normal,objectMass){
 const arm={x:o.x-b.x,y:o.y-b.y},vx=b.vx-(b.w??0)*arm.y-o.vx,vy=b.vy+(b.w??0)*arm.x-o.vy;
 const speed=Math.max(0,vx*normal.x+vy*normal.y),mass=1/(1/Math.max(1,b.spec.mass)+1/(objectMass*1.7));
 // Soft stopping distances: ring 8 cm, training mannequin 12 cm. Work/energy
 // gives a triangular force pulse, F_peak = m_eff*v_normal² / distance.
 const compliance=o.kind==='ring'?.08:.12;
 return{speed,force:mass*speed*speed/compliance,impulse:mass*speed,energy:.5*mass*speed*speed};
}
export function rescueResult(b,o,time){
 const approach=rescueApproach(b,o),contact=o.contactMetrics?.[b.id??'boat']??{},peakForce=contact.peakForce??0;
 const speedPenalty=40*clamp(approach.relativeSpeed/.55,0,1)**2,impactPenalty=50*clamp(peakForce/1000,0,1),gearPenalty=contact.inGear?10:0;
 return{objectId:o.id,kind:o.kind,boatId:b.id??'boat',elapsed:Math.max(0,time-o.thrownAt),pickupSpeed:approach.relativeSpeed,closingSpeed:approach.closingSpeed,peakForce,contacts:contact.contacts??0,contactInGear:!!contact.inGear,enginesNeutral:approach.neutral,enginesRunning:approach.running,engines:approach.engines,score:Math.round(clamp(100-speedPenalty-impactPenalty-gearPenalty,0,100))};
}
export function selectedRescue(fleet){const objects=fleet?.rescue?.objects??[];return objects.find(o=>o.id===fleet.rescue.targetId&&!o.recovered)??objects.find(o=>!o.recovered);}
export function validRescueResult(r){
 const positive=x=>Number.isFinite(x)&&x>=0;
 return r&&/^rescue-\d+$/.test(r.objectId)&&['ring','mob'].includes(r.kind)&&typeof r.boatId==='string'
  &&['elapsed','pickupSpeed','peakForce','contacts','enginesRunning','score'].every(k=>positive(r[k]))&&r.score<=100&&Number.isFinite(r.closingSpeed)
  &&typeof r.enginesNeutral==='boolean'&&typeof r.contactInGear==='boolean'&&Array.isArray(r.engines)&&r.engines.length<=2
  &&r.engines.every(e=>['off','ignition','starting','running'].includes(e.key)&&[-1,0,1].includes(e.gear)&&(e.command===undefined||Number.isFinite(e.command)));
}
