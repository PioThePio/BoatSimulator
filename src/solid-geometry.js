const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function pierSegment(a,b,width,properties={}){
 const length=Math.hypot(b.x-a.x,b.y-a.y),angle=Math.atan2(b.y-a.y,b.x-a.x),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,w=Math.abs(b.x-a.x)+Math.abs(Math.sin(angle))*width,h=Math.abs(b.y-a.y)+Math.abs(Math.cos(angle))*width;
 return{...properties,x:cx-w/2,y:cy-h/2,w,h,pose:{x:cx,y:cy,a:angle,length,width}};
}
export function solidPose(d){return d.pose??{x:d.x+d.w/2,y:d.y+d.h/2,a:0,length:d.w,width:d.h};}
export function solidPoint(d,x,y){const p=solidPose(d),c=Math.cos(p.a),s=Math.sin(p.a);return{x:p.x+c*x-s*y,y:p.y+s*x+c*y};}
export function closestSolidPoint(d,x,y){
 if(!d.pose)return{x:clamp(x,d.x,d.x+d.w),y:clamp(y,d.y,d.y+d.h)};
 const p=d.pose,c=Math.cos(p.a),s=Math.sin(p.a),dx=x-p.x,dy=y-p.y;
 return solidPoint(d,clamp(dx*c+dy*s,-p.length/2,p.length/2),clamp(-dx*s+dy*c,-p.width/2,p.width/2));
}
export function circleSolidHit(p,radius,d){
 if(p.x+radius<=d.x||p.x-radius>=d.x+d.w||p.y+radius<=d.y||p.y-radius>=d.y+d.h)return null;
 if(d.pose){const q=d.pose,c=Math.cos(q.a),s=Math.sin(q.a),dx=p.x-q.x,dy=p.y-q.y,h=circleSolidHit({x:dx*c+dy*s,y:-dx*s+dy*c},radius,{x:-q.length/2,y:-q.width/2,w:q.length,h:q.width});return h?{...h,n:{x:c*h.n.x-s*h.n.y,y:s*h.n.x+c*h.n.y},near:solidPoint(d,h.near.x,h.near.y)}:null;}
 const near=closestSolidPoint(d,p.x,p.y),dx=p.x-near.x,dy=p.y-near.y,dist=Math.hypot(dx,dy);let depth=radius-dist,n;if(depth<=0)return null;
 if(dist<1e-8){const f=[{v:p.x-d.x,x:-1,y:0},{v:d.x+d.w-p.x,x:1,y:0},{v:p.y-d.y,x:0,y:-1},{v:d.y+d.h-p.y,x:0,y:1}].sort((a,b)=>a.v-b.v)[0];n={x:f.x,y:f.y};depth=radius+f.v;}else n={x:dx/dist,y:dy/dist};return{n,depth,near};
}
export function orientedFaces(d,id){const p=d.pose,L=p.length/2,W=p.width/2,c=Math.cos(p.a),s=Math.sin(p.a);return[[-L,-W,L,-W,0,-1],[-L,W,L,W,0,1],[-L,-W,-L,W,-1,0],[L,-W,L,W,1,0]].map(([x,y,u,v,nx,ny],j)=>{const a=solidPoint(d,x,y),b=solidPoint(d,u,v),dx=b.x-a.x,dy=b.y-a.y;return{id:id+'-'+j,a,b,dx,dy,length2:dx*dx+dy*dy,nx:c*nx-s*ny,ny:s*nx+c*ny,coefficient:.6};});}
