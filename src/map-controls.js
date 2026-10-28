import {WORLD,clamp} from './world.js';
export const fitScale=(w,h)=>Math.min((w-30)/(WORLD.right-WORLD.left),(h-30)/(WORLD.bottom-WORLD.top));
export function createAtlas(){return{camera:{x:(WORLD.left+WORLD.right)/2,y:(WORLD.top+WORLD.bottom)/2},zoom:1};}
export function atlasProjection(atlas,w,h){return{camera:{...atlas.camera},scale:fitScale(w,h)*atlas.zoom};}
export function panAtlas(atlas,dx,dy,w,h){const {scale}=atlasProjection(atlas,w,h);atlas.camera.x=clamp(atlas.camera.x-dx/scale,WORLD.left,WORLD.right);atlas.camera.y=clamp(atlas.camera.y-dy/scale,WORLD.top,WORLD.bottom);}
export function zoomAtlas(atlas,factor,x,y,w,h){
 const before=atlasProjection(atlas,w,h),wx=before.camera.x+(x-w/2)/before.scale,wy=before.camera.y+(y-h/2)/before.scale;
 atlas.zoom=clamp(atlas.zoom*factor,1,500);
 const after=atlasProjection(atlas,w,h);atlas.camera.x=clamp(wx-(x-w/2)/after.scale,WORLD.left,WORLD.right);atlas.camera.y=clamp(wy-(y-h/2)/after.scale,WORLD.top,WORLD.bottom);
}
export function installMapGestures(canvas,api){
 const pointers=new Map();let moved=false,pinched=false,start=null,consumeClick=false,lastTap=null;
 const local=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
 const stop=e=>{e.preventDefault();e.stopImmediatePropagation();};
 const metrics=()=>{const p=[...pointers.values()];return{x:p.reduce((s,q)=>s+q.x,0)/p.length,y:p.reduce((s,q)=>s+q.y,0)/p.length,d:p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0};};
 canvas.addEventListener('pointerdown',e=>{
  if(!api.active()){consumeClick=false;return;}stop(e);consumeClick=true;
  if(!pointers.size){moved=pinched=false;start=local(e);}pointers.set(e.pointerId,local(e));if(pointers.size>1)pinched=true;canvas.setPointerCapture(e.pointerId);
 },{capture:true});
 canvas.addEventListener('pointermove',e=>{
  if(!pointers.has(e.pointerId))return;stop(e);const before=metrics(),p=local(e);pointers.set(e.pointerId,p);const after=metrics(),{width,height}=api.size();
  if(Math.hypot(p.x-start.x,p.y-start.y)>4)moved=true;
  panAtlas(api.atlas(),after.x-before.x,after.y-before.y,width,height);
  if(pointers.size>1&&before.d>1&&after.d>1)zoomAtlas(api.atlas(),after.d/before.d,after.x,after.y,width,height);
 },{capture:true});
 const release=e=>{
  if(!pointers.has(e.pointerId))return;stop(e);pointers.delete(e.pointerId);
  if(!pointers.size&&!moved&&!pinched&&e.type==='pointerup'){const p=local(e),q=api.labels().find(q=>q.poiId&&p.x>=q.x&&p.x<=q.x+q.w&&p.y>=q.y&&p.y<=q.y+q.h);if(q){lastTap=null;api.focus(q);}else{const now=performance.now();if(lastTap&&now-lastTap.at<340&&Math.hypot(p.x-lastTap.x,p.y-lastTap.y)<22){const{width,height}=api.size(),projection=atlasProjection(api.atlas(),width,height);api.focus({worldX:projection.camera.x+(p.x-width/2)/projection.scale,worldY:projection.camera.y+(p.y-height/2)/projection.scale});lastTap=null;}else lastTap={...p,at:now};}}
 };
 for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,release,{capture:true});
 canvas.addEventListener('click',e=>{if(api.active()||consumeClick){stop(e);consumeClick=false;}},{capture:true});
 canvas.addEventListener('dblclick',e=>{if(!api.active())return;stop(e);const p=local(e),{width,height}=api.size(),q=atlasProjection(api.atlas(),width,height);api.focus({worldX:q.camera.x+(p.x-width/2)/q.scale,worldY:q.camera.y+(p.y-height/2)/q.scale});},{capture:true});
 canvas.addEventListener('wheel',e=>{if(!api.active())return;stop(e);const p=local(e),{width,height}=api.size();zoomAtlas(api.atlas(),Math.exp(-clamp(e.deltaY,-500,500)*.002),p.x,p.y,width,height);},{capture:true,passive:false});
 return{clear(){pointers.clear();moved=pinched=false;consumeClick=false;}};
}
