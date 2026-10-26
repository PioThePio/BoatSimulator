import {windBounds} from './wind-field.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),TAU=Math.PI*2;
const hash=(x,y)=>{const q=Math.sin(x*127.1+y*311.7)*43758.5453;return q-Math.floor(q);};
export function windMarkers(bounds,scale,time,e,flowAt){
 if(e.windVisuals===false||windBounds(e).max<.5)return[];
 const width=bounds.right-bounds.left,height=bounds.bottom-bounds.top,step=Math.max(24,140/scale,Math.sqrt(width*height/22)),out=[];
 for(let row=Math.floor(bounds.top/step);row*step<bounds.bottom;row++)for(let col=Math.floor(bounds.left/step);col*step<bounds.right;col++){
  const seed=hash(col,row),x=(col+.2+.6*seed)*step,y=(row+.2+.6*hash(row,col+7))*step;
  const flow=flowAt(x,y),speed=Math.hypot(flow.x,flow.y);if(speed<.5)continue;
  const dx=flow.x/speed,dy=flow.y/speed,age=(time/5+seed)%1,travel=age*5*(.5+.18*speed),opacity=(.18+.20*clamp(speed/12,0,1))*Math.sin(Math.PI*age)**2;
  out.push({id:col+':'+row,x:x+dx*travel,y:y+dy*travel,dx,dy,length:clamp(6+speed*.25,6,10)/scale,opacity});
 }
 return out.slice(0,40);
}
// The crest follows k*n.dot(position)-omega*t=2*pi*j, the dominant physical
// wave in waveAt. Only display detail is decimated when the map is zoomed out.
export function waveCrests(bounds,scale,time,angle,spectrum,height){
 if(height<.006)return[];
 const nx=Math.sin(angle),ny=-Math.cos(angle),tx=-ny,ty=nx;
 const corners=[[bounds.left,bounds.top],[bounds.right,bounds.top],[bounds.left,bounds.bottom],[bounds.right,bounds.bottom]],along=corners.map(([x,y])=>x*nx+y*ny),across=corners.map(([x,y])=>x*tx+y*ty),{k,omega,wavelength}=spectrum;
 const stride=Math.max(1,Math.ceil(24/(wavelength*scale))),spacing=Math.max(13,90/scale),lo=Math.min(...across),hi=Math.max(...across),out=[];
 const first=Math.floor((Math.min(...along)*k-omega*time)/TAU/stride)*stride,last=Math.ceil((Math.max(...along)*k-omega*time)/TAU);
 for(let j=first;j<=last;j+=stride)for(let col=Math.floor(lo/spacing);col*spacing<hi;col++){
  const seed=hash(j,col);if(seed>.45)continue;
  const u=(TAU*j+omega*time)/k,v=(col+.15+seed*.7)*spacing,length=Math.min(8,spacing*.6)*( .55+.45*hash(col,j));
  const fade=.7+.3*Math.sin(time*.65+seed*TAU),opacity=clamp(height*.65,.035,.25)*fade;
  out.push({id:j+':'+col,x:nx*u+tx*v,y:ny*u+ty*v,nx,ny,tx,ty,length,curl:(.55+height*1.2)*(.65+.35*Math.sin(time*.55+seed*TAU)),opacity,seed});
 }
 return out;
}
export function foamPatches(crests,time,white,scale){
 if(white<=0)return[];const out=[];
 for(const c of crests){
  const chance=hash(c.seed*1000,7);if(chance>.12+.35*white)continue;
  const age=(time*.34+c.seed*9)%1,opacity=white*.40*Math.sin(Math.PI*age)**2;if(opacity<.015)continue;
  out.push({...c,x:c.x+c.nx*c.curl*.75,y:c.y+c.ny*c.curl*.75,age,opacity,radius:Math.min(.09,1.2/scale),span:Math.min(2.2,c.length*.4)});if(out.length===14)break;
 }
 return out;
}
