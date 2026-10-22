import {bottomAt,clamp} from './world.js';
export const SUV_GEOMETRY={length:4.9,beam:2,wb:2.9,hitch:2.75,mass:2400,iz:5400,hp:250,maxSteer:34*Math.PI/180,wheelTurns:2.5};
export function bodyPoint(q,x=0,y=0){const c=Math.cos(q.a),s=Math.sin(q.a);return{x:q.x+c*x-s*y,y:q.y+s*x+c*y,vx:q.vx-q.w*(s*x+c*y),vy:q.vy+q.w*(c*x-s*y)};}
export function bodyLocal(q,p){const c=Math.cos(q.a),s=Math.sin(q.a),x=p.x-q.x,y=p.y-q.y;return{x:c*x+s*y,y:-s*x+c*y};}
export function kick(q,jx,jy,x=0,y=0){q.vx+=jx/q.mass;q.vy+=jy/q.mass;q.w+=(x*jy-y*jx)/q.iz;}
export function frameZ(q,x=0){return(q.z??0)+x*Math.sin(q.pitch??0);}
export function bunkZ(t,x){return frameZ(t,x)+(t.bunkHeight-.4);}
export function updateTowGeometry(r){
 const c=r.car,t=r.trailer,S=SUV_GEOMETRY,front=bodyPoint(c,S.wb/2),rear=bodyPoint(c,-S.wb/2);
 const zf=-bottomAt(front.x,front.y).depth-(r.frontSink??0),zr=-bottomAt(rear.x,rear.y).depth-(r.rearSink??0);
 c.pitch=Math.atan2(zf-zr,S.wb);c.z=(zf+zr)/2+.45;
 const ax=t.axleX??0,axlePoint=bodyPoint(t,ax),axle=-bottomAt(axlePoint.x,axlePoint.y).depth+.4,h=bodyPoint(t,t.hitch),hitchZ=r.attached?frameZ(c,-S.hitch)+.10:-bottomAt(h.x,h.y).depth+.55;
 t.pitch=clamp(Math.atan2(hitchZ-axle,t.hitch-ax),-.38,.38);t.z=axle-ax*Math.sin(t.pitch);r.grade=t.pitch;
}
