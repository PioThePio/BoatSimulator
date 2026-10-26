import {bodyPoint,kick} from './tow-geometry.js';

// Accumulated contact impulses share a finite Coulomb budget across solver
// iterations. Opposite wheel contacts resist yaw as well as translation.
export function parkingContact(body,x,y,normal,mu,dt){
 const p=bodyPoint(body,x,y);return{body,rx:p.x-body.x,ry:p.y-body.y,limit:Math.max(0,normal*mu*dt),jx:0,jy:0};
}
export function solveParkingContact(q){
 const b=q.body,inv=1/b.mass,A=inv+q.ry*q.ry/b.iz,B=-q.rx*q.ry/b.iz,D=inv+q.rx*q.rx/b.iz,det=A*D-B*B;
 const vx=b.vx-b.w*q.ry,vy=b.vy+b.w*q.rx;
 let x=q.jx+(-D*vx+B*vy)/det,y=q.jy+(B*vx-A*vy)/det;
 const scale=Math.max(1,Math.hypot(x,y)/Math.max(1e-12,q.limit));x/=scale;y/=scale;
 kick(b,x-q.jx,y-q.jy,q.rx,q.ry);q.jx=x;q.jy=y;
}
