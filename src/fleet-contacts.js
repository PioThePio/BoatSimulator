import {clamp} from './world.js';
import {point,inverseMass,impulse} from './rigging.js';
import {hullContactSamples} from './hull-geometry.js';
import {fenderGeometry,fenderContact} from './fenders.js';
import {recordImpact} from './impacts.js';
const notify=b=>message=>{b.events.unshift({time:b.time,message});b.events.splice(12);};
function nearest(q,p){const c=Math.cos(q.a),s=Math.sin(q.a),radius=q.spec.beam*.45,offset=Math.max(0,q.spec.length*.5-radius),along=clamp((p.x-q.x)*c+(p.y-q.y)*s,-offset,offset);return{x:q.x+c*along,y:q.y+s*along,radius};}
function fenders(a,b,dt){
 if(!a.fenders)return;
 for(const g of fenderGeometry(a.spec)){const p=point(a,g.x,g.y),q=nearest(b,p),dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),depth=g.radius+q.radius-d;if(depth<=0||d<1e-6)continue;const n={x:dx/d,y:dy/d},arm={x:q.x-b.x,y:q.y-b.y};
  fenderContact(a,g,{n,depth,target:'fleet-'+b.id,otherVelocity:{x:b.vx-b.w*arm.y,y:b.vy+b.w*arm.x},otherInverse:n=>inverseMass(b,n,arm),react:(n,j)=>impulse(b,n,j,arm)},dt,notify(a));
 }
}
export function fleetContacts(a,b,dt){
 if(Math.hypot(a.x-b.x,a.y-b.y)>(a.spec.length+b.spec.length)/2+2)return;
 if(a.towRig?.secured&&a.towRig.boatLoaded||b.towRig?.secured&&b.towRig.boatLoaded)return;
 fenders(a,b,dt);fenders(b,a,dt);
 // Same capsule contact model as the marina, with reciprocal impulses/damage.
 for(const sample of hullContactSamples(a.spec)){
  const p=point(a,sample.x,0),q=nearest(b,p),dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy),depth=sample.radius+q.radius-d;if(depth<=0||d<1e-6)continue;
  const n={x:dx/d,y:dy/d},aa={x:p.x-a.x-n.x*sample.radius,y:p.y-a.y-n.y*sample.radius},ab={x:q.x-b.x+n.x*q.radius,y:q.y-b.y+n.y*q.radius};
  const va={x:a.vx-a.w*aa.y,y:a.vy+a.w*aa.x},vb={x:b.vx-b.w*ab.y,y:b.vy+b.w*ab.x},vn=(va.x-vb.x)*n.x+(va.y-vb.y)*n.y,ia=inverseMass(a,n,aa),ib=inverseMass(b,n,ab),effective=1/(ia+ib);
  if(vn<0){const j=-vn*effective;impulse(a,n,j,aa);impulse(b,n,-j,ab);for(const [body,arm,target]of [[a,aa,b.id],[b,ab,a.id]])recordImpact(body,{arm,speed:-vn,effective:effective*.5,target:'fleet-'+target,dock:false},notify(body));}
  const correction=Math.min(.12,depth*.65);a.x+=n.x*correction*ia/(ia+ib);a.y+=n.y*correction*ia/(ia+ib);b.x-=n.x*correction*ib/(ia+ib);b.y-=n.y*correction*ib/(ia+ib);
 }
}
