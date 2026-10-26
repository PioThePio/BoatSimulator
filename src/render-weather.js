import {weatherAt,waveReference,waveHeight,waveDirection,environment,clamp} from './world.js';
import {waveCurrent} from './wave-current.js';
import {windSurface} from './wind-response.js';
import {windMarkers,waveCrests,foamPatches} from './surface-weather.js';
function crestPath(path,c,offset=0,thickness=.15){
 const {x,y,tx,ty,nx,ny,length:L,curl}=c;
 path.moveTo(x-tx*L/2+nx*offset,y-ty*L/2+ny*offset);
 path.bezierCurveTo(x-tx*L*.2+nx*(curl+offset),y-ty*L*.2+ny*(curl+offset),x+tx*L*.2+nx*(curl+offset),y+ty*L*.2+ny*(curl+offset),x+tx*L/2+nx*offset,y+ty*L/2+ny*offset);
 path.bezierCurveTo(x+tx*L*.2+nx*(curl+offset+thickness),y+ty*L*.2+ny*(curl+offset+thickness),x-tx*L*.2+nx*(curl+offset+thickness),y-ty*L*.2+ny*(curl+offset+thickness),x-tx*L/2+nx*offset,y-ty*L/2+ny*offset);path.closePath();
}
export function drawWeatherSurface(ctx,b,e,bounds,scale){
 const weather=weatherAt(b.time,e),reference=waveReference(e),angle=waveDirection(e,b.time),H=waveHeight(e,b.time),ca=reference.currentDirection*Math.PI/180,nx=Math.sin(angle),ny=-Math.cos(angle),spectrum=waveCurrent(2.8,3,reference.currentSpeed*(Math.sin(ca)*nx-Math.cos(ca)*ny)),wind=windSurface(weather.windSpeed,e.windVisuals!==false);
 if(wind.tint){ctx.fillStyle=`rgba(100,114,124,${wind.tint})`;ctx.fillRect(bounds.left,bounds.top,bounds.right-bounds.left,bounds.bottom-bounds.top);}
 const crests=waveCrests(bounds,scale,b.time,angle,spectrum,H*spectrum.heightScale),bands=[new Path2D(),new Path2D(),new Path2D()],shadows=[new Path2D(),new Path2D(),new Path2D()];
 for(const c of crests){const band=clamp(Math.floor(c.opacity*12),0,2);crestPath(bands[band],c,0,.14+H*.40);crestPath(shadows[band],c,.30,.22+H*.45);}
 for(let i=0;i<3;i++){ctx.fillStyle=`rgba(47,104,122,${.025+i*.022})`;ctx.fill(shadows[i]);ctx.fillStyle=`rgba(202,229,225,${.10+i*.065})`;ctx.fill(bands[i]);}
 // Foam is a short-lived patch on a crest, not a field of bright rain strokes.
 const foam=foamPatches(crests,b.time,wind.white,scale);for(const f of foam){
  ctx.fillStyle=`rgba(249,253,242,${f.opacity})`;ctx.beginPath();
  for(let i=0;i<3;i++){const d=(i-1)*f.span*.25;ctx.ellipse(f.x+f.tx*d+f.nx*.10,f.y+f.ty*d+f.ny*.10,f.span*.25,.14+f.radius,Math.atan2(f.ty,f.tx),0,Math.PI*2);}
  for(let i=0;i<9;i++){const along=((i/8)-.5)*f.span,across=Math.sin(i*2.4+f.seed*20)*.12,r=f.radius*(.6+.4*Math.sin(i+1)**2);ctx.ellipse(f.x+f.tx*along+f.nx*across,f.y+f.ty*along+f.ny*across,r*1.7,r,Math.atan2(f.ty,f.tx),0,Math.PI*2);}ctx.fill();
 }
 // Bounded sparse arrows use the same local field and shelter as the hull.
 const marks=windMarkers(bounds,scale,b.time,e,(x,y)=>environment(b.time,e,x,y).wind);
 ctx.lineWidth=.75/scale;ctx.lineCap='round';
 for(const m of marks){const {x,y,dx,dy,length:L}=m,head=2/scale;ctx.strokeStyle=`rgba(247,246,226,${m.opacity})`;ctx.beginPath();ctx.moveTo(x-dx*L,y-dy*L);ctx.lineTo(x,y);ctx.moveTo(x-dx*head-dy*head*.65,y-dy*head+dx*head*.65);ctx.lineTo(x,y);ctx.lineTo(x-dx*head+dy*head*.65,y-dy*head-dx*head*.65);ctx.stroke();}
 ctx.lineCap='butt';return{crests:crests.length,foam:foam.length,wind:marks.length};
}
