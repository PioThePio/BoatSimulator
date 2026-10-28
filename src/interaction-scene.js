import {closestSolidPoint} from './solid-geometry.js';
import {shoreAt,bottomAt,DOCKS,environment} from './world.js';
import {bankSuctionForce,passingInteraction} from './hydro-interactions.js';
import {point,impulse} from './rigging.js';
export function sampleBankGeometry(b){
 const S=b.spec,c=Math.cos(b.a),s=Math.sin(b.a),shore=shoreAt(b.x,b.y),depth=bottomAt(b.x,b.y).depth;
 let distance=Math.max(0,shore.distance),nx=-shore.nx,ny=-shore.ny,hard=false;
 for(const d of DOCKS){const near=closestSolidPoint(d,b.x,b.y),x=near.x,y=near.y,r=Math.hypot(x-b.x,y-b.y);if(r>.01&&r<distance){distance=r;nx=(x-b.x)/r;ny=(y-b.y)/r;hard=true;}}
 let steepness=0;if(hard)steepness=1;else if(!shore.beach&&shore.distance>0&&shore.distance<S.length*2+S.beam){const x=b.x-shore.nx*shore.distance,y=b.y-shore.ny*shore.distance,slope=(bottomAt(x+shore.nx*2,y+shore.ny*2).depth-bottomAt(x+shore.nx*.3,y+shore.ny*.3).depth)/1.7;steepness=Math.max(0,Math.min(1,(slope-.16)/.3));}
 const extent=Math.abs(c*nx+s*ny)*S.length*.5+Math.abs(-s*nx+c*ny)*S.beam*.5;
 return{gap:Math.max(0,distance-extent),nx,ny,steepness,depth};
}
export function bankForce(b,speed,geometry){return bankSuctionForce({...geometry,mass:b.spec.mass,length:b.spec.length,beam:b.spec.beam,draft:b.spec.draft,speed,heading:b.a});}
export function vesselInteractions(fleet,e,dt){
 for(const b of fleet.boats)b.passingForce=0;
 if(e.hydroInteractions!==true)return;
 const apply=(a,b)=>{
  if(a.stored||b.stored)return;
  if(Math.hypot(a.x-b.x,a.y-b.y)>(a.spec.length+b.spec.length)*1.5)return;
  if(a.towRig?.secured&&a.towRig.boatLoaded||b.towRig?.secured&&b.towRig.boatLoaded)return;
  const f=passingInteraction(a,b,environment(fleet.time,e,a.x,a.y).current,environment(fleet.time,e,b.x,b.y).current);if(!f)return;
  const n={x:f.x/f.magnitude,y:f.y/f.magnitude},pa=point(a,f.armA,0),pb=point(b,f.armB,0);
  impulse(a,n,f.magnitude*dt,{x:pa.x-a.x,y:pa.y-a.y});impulse(b,n,-f.magnitude*dt,{x:pb.x-b.x,y:pb.y-b.y});a.passingForce=(a.passingForce??0)+f.magnitude;b.passingForce=(b.passingForce??0)+f.magnitude;
 };
 for(let i=0;i<fleet.boats.length;i++){for(let j=i+1;j<fleet.boats.length;j++)apply(fleet.boats[i],fleet.boats[j]);if(e.traffic)for(const q of fleet.boats[0].traffic)apply(fleet.boats[i],q);}
}
