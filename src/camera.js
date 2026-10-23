import {clamp,WORLD} from './world.js';
import {SUV_GEOMETRY,bodyPoint} from './tow-geometry.js';
export function vehicleLookAhead(r){return r.gear==='R'?-1.5:r.gear==='D'?1.5:0;}
export function towView(r,b,width,height,requestedScale){
 const points=[];
 const box=(q,left,right,beam)=>{for(const x of [left,right])for(const y of [-beam/2,beam/2])points.push(bodyPoint(q,x,y));};
 box(r.car,-SUV_GEOMETRY.length/2,SUV_GEOMETRY.length/2,SUV_GEOMETRY.beam);
 if(r.attached){const t=r.trailer;box(t,t.offset-r.boatLength*.58,t.hitch,t.beam);if(r.boatLoaded)box(b,-b.spec.length*.6,b.spec.length*.55,b.spec.beam);}
 const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
 const padding=Math.min(38,Math.min(width,height)*.09),lead=vehicleLookAhead(r);
 // Fit the complete, articulated envelope at the same scale in every gear.
 const scale=Math.min(requestedScale,(width-2*padding)/(right-left+3),(height-2*padding)/(bottom-top+3));
 const hx=(width-2*padding)/scale/2,hy=(height-2*padding)/scale/2;
 const camera={x:clamp((left+right)/2+Math.cos(r.car.a)*lead,right-hx,left+hx),y:clamp((top+bottom)/2+Math.sin(r.car.a)*lead,bottom-hy,top+hy)};
 return{camera,scale,points,padding};
}
export function minimapProjection(width,height,focus,span=3500){
 const scale=Math.min(width/span,height/(span*2/3)),worldWidth=width/scale,worldHeight=height/scale;
 return{scale,x:0,y:0,left:clamp(focus.x-worldWidth/2,WORLD.left,WORLD.right-worldWidth),top:clamp(focus.y-worldHeight/2,WORLD.top,WORLD.bottom-worldHeight),worldWidth,worldHeight};
}
