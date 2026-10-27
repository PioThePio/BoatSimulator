import {bodyPoint,SUV_GEOMETRY} from './tow-geometry.js';
import {hullOutline} from './hull-geometry.js';
export const COUPLER_LIMIT=85*Math.PI/180;
export const trailerHitchLength=S=>S.length*.14+S.length*.59+.35+1.2;
function separation(a,b){
 let gap=-Infinity;
 for(const poly of[a,b])for(let i=0;i<poly.length;i++){
  const p=poly[i],q=poly[(i+1)%poly.length],length=Math.hypot(q.x-p.x,q.y-p.y);if(length<1e-8)continue;
  const nx=-(q.y-p.y)/length,ny=(q.x-p.x)/length,ap=a.map(p=>p.x*nx+p.y*ny),bp=b.map(p=>p.x*nx+p.y*ny);
  gap=Math.max(gap,Math.min(...bp)-Math.max(...ap),Math.min(...ap)-Math.max(...bp));
 }return gap;
}
function rail(a,b,radius){const d=Math.hypot(b.x-a.x,b.y-a.y),x=-(b.y-a.y)/d*radius,y=(b.x-a.x)/d*radius;return[{x:a.x+x,y:a.y+y},{x:b.x+x,y:b.y+y},{x:b.x-x,y:b.y-y},{x:a.x-x,y:a.y-y}];}
// The hitch can articulate while the drawbar, bow and winch post clear the
// SUV. The mechanical coupler limit is independent of body contact.
export function articulationStatus(r,b){
 const angle=Math.abs(Math.atan2(Math.sin(r.trailer.a-r.car.a),Math.cos(r.trailer.a-r.car.a))),pin=bodyPoint(r.trailer,r.trailer.hitch),ball=bodyPoint(r.car,-SUV_GEOMETRY.hitch);
 // Broad phase for the normal straight/low-angle operating envelope.
 if(angle<.7&&Math.hypot(pin.x-ball.x,pin.y-ball.y)<.05)return{angle,clearance:.2,contact:false,warning:false,penetration:0};
 const car=[[-.5,-.5],[.5,-.5],[.5,.5],[-.5,.5]].map(([x,y])=>bodyPoint(r.car,x*SUV_GEOMETRY.length,y*SUV_GEOMETRY.beam));
 const t=r.trailer,front=t.offset+b.spec.length*.45-.4,p=bodyPoint(t,t.hitch),parts=[];
 for(const side of[-1,1])parts.push(rail(p,bodyPoint(t,front,side*t.beam*.46),.065));
 const post=bodyPoint(t,t.offset+b.spec.length*.59+.35);parts.push([[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:post.x+x*.14,y:post.y+y*.14})));
 if(r.boatLoaded&&r.secured)parts.push(hullOutline(b.spec).map(q=>bodyPoint(t,t.offset+q.x,q.y)));
 const clearance=Math.min(...parts.map(poly=>separation(car,poly))),excess=angle-COUPLER_LIMIT;
 return{angle,clearance,contact:clearance<-.005||excess>0,warning:clearance<.16||angle>COUPLER_LIMIT-.10,penetration:Math.max(0,-clearance,excess)};
}
