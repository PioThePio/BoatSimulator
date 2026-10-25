// A visual cache only: exact shoreline/depth/contacts never read this bitmap.
// Keep a padded viewport and reuse it under small camera translations/zoom.
const caches=new WeakMap();
export function cachedTerrain(ctx,bounds,paint){
 const transform=ctx.getTransform(),scale=Math.hypot(transform.a,transform.b),margin=160;
 let q=caches.get(ctx);
 if(!q||scale/q.scale<.8||scale/q.scale>1.25||bounds.left<q.left||bounds.top<q.top||bounds.right>q.right||bounds.bottom>q.bottom){
  const left=bounds.left-margin/scale,top=bounds.top-margin/scale,right=bounds.right+margin/scale,bottom=bounds.bottom+margin/scale;
  const canvas=document.createElement('canvas');canvas.width=Math.ceil((right-left)*scale);canvas.height=Math.ceil((bottom-top)*scale);
  const c=canvas.getContext('2d');c.setTransform(scale,0,0,scale,-left*scale,-top*scale);paint(c,{left,top,right,bottom});
  q={canvas,left,top,right,bottom,scale};caches.set(ctx,q);
 }
 ctx.drawImage(q.canvas,q.left,q.top,q.right-q.left,q.bottom-q.top);
}
