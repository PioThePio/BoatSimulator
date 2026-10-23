// First-order, finite-wall reflection. Normals point from the wall into water.
// No repeated reflections or energy feedback; each returned wave loses energy.
export function mirrorPoint(p,f){const d=(p.x-f.a.x)*f.nx+(p.y-f.a.y)*f.ny;return{x:p.x-2*d*f.nx,y:p.y-2*d*f.ny};}
export function mirrorVector(p,f){const d=p.x*f.nx+p.y*f.ny;return{x:p.x-2*d*f.nx,y:p.y-2*d*f.ny};}
export function wallDistance(p,f){return(p.x-f.a.x)*f.nx+(p.y-f.a.y)*f.ny;}
export function wallHit(from,to,f){
 const d0=wallDistance(from,f),d1=wallDistance(to,f);
 if(d0<=.001||d1>=0)return false;
 const t=d0/(d0-d1),x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t;
 const dx=f.b.x-f.a.x,dy=f.b.y-f.a.y,u=((x-f.a.x)*dx+(y-f.a.y)*dy)/(dx*dx+dy*dy);
 return u>=0&&u<=1;
}
export function reflectField(w,f){
 const out={eta:w.eta*f.coefficient};
 for(const [x,y]of [['sx','sy'],['vx','vy'],['ax','ay']]){const r=mirrorVector({x:w[x],y:w[y]},f);out[x]=r.x*f.coefficient;out[y]=r.y*f.coefficient;}
 return out;
}
