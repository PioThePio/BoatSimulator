// Deck-height guards are separate from water-level boat collision solids.
import {BRIDGES} from './zegrze.js';
import {pierSegment,circleSolidHit} from './solid-geometry.js';
import {bodyPoint,kick} from './tow-geometry.js';
export const BRIDGE_RAILS=BRIDGES.filter(q=>!q.rail&&!q.dam).flatMap(q=>{
 const dx=q.b.x-q.a.x,dy=q.b.y-q.a.y,L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L,n=Math.ceil(L/8);
 return [-1,1].flatMap(side=>Array.from({length:n},(_,i)=>{const at=t=>({x:q.a.x+dx*t+nx*side*(q.width/2-.2),y:q.a.y+dy*t+ny*side*(q.width/2-.2)});return pierSegment(at(i/n),at((i+1)/n),.18,{id:q.id+'-'+side+'-'+i,bridge:q.id});}));
});
export function onBridge(q,padding=0){return BRIDGES.some(b=>{const dx=b.b.x-b.a.x,dy=b.b.y-b.a.y,L=Math.hypot(dx,dy),x=q.x-b.a.x,y=q.y-b.a.y,t=(x*dx+y*dy)/L;return t>=-padding&&t<=L+padding&&Math.abs(-x*dy+y*dx)/L<=b.width/2+padding;});}
export function bridgeRailContact(r,q,length,beam,dt){
 if(!onBridge(q,length))return;r.guardDamage??={};
 for(const rail of BRIDGE_RAILS){if(r.guardDamage[rail.id]>=1)continue;
 for(const x of[-length*.36,0,length*.36]){const p=bodyPoint(q,x),hit=circleSolidHit(p,beam*.48,rail);if(!hit)continue;
 const n=hit.n,rx=p.x-q.x,ry=p.y-q.y,v=p.vx*n.x+p.vy*n.y,lever=rx*n.y-ry*n.x,inv=1/q.mass+lever*lever/q.iz;
 const energy=v<0?.5*v*v/inv:0;
 // A substantial strike can break one segment; gentle glances are contained.
 if(energy>4500){r.guardDamage[rail.id]=1;r.carDamage=Math.min(100,r.carDamage+energy/4000);r.status='Uderzenie · uszkodzona bariera mostu';continue;}
 const j=Math.max(0,(-v+Math.min(.35,hit.depth*5))/inv);kick(q,n.x*j,n.y*j,rx,ry);
 }
 }
}
