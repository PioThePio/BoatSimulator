// Operate the retained map UI; do not depend on the removed bottom controls.
export async function openBollard(page,target=null){
 if(await page.locator('#mooring-picker').isVisible())await page.locator('#close-mooring').click();
 const p=await page.evaluate(async target=>{
  window.dispatchEvent(new Event('blur'));
  const {restoreSession}=await import('/src/session-save.js'),{renderWorld}=await import('/src/render.js'),{BOLLARDS}=await import('/src/world.js'),{mooringPoint}=await import('/src/marina.js'),{cleat}=await import('/src/rigging.js');
  const s=restoreSession(localStorage.getItem('przystan-session-v1')).session,b=s.fleet.boats.find(b=>b.id===s.fleet.activeId),lake=document.querySelector('#lake').getBoundingClientRect(),canvas=document.createElement('canvas');
  canvas.width=lake.width;canvas.height=lake.height;
  const view=renderWorld(canvas.getContext('2d'),{...s.ui,boat:b,env:s.env,width:lake.width,height:lake.height,towRig:s.towRig,rigBoat:s.fleet.boats.find(b=>b.id===s.fleet.rigBoatId),fleet:s.fleet,focus:s.vehicle==='suv'?s.towRig.car:null});
  const bow=cleat(b,'bow'),points=BOLLARDS.map((_,i)=>mooringPoint(b,i));const q=target===null?points.reduce((a,q)=>Math.hypot(q.x-bow.x,q.y-bow.y)<Math.hypot(a.x-bow.x,a.y-bow.y)?q:a):typeof target==='number'?points[target]:points[BOLLARDS.findIndex(q=>q.id===target)];
  return{x:lake.width/2+(q.x-view.camera.x)*view.scale,y:lake.height/2+(q.y-view.camera.y)*view.scale};
 },target);
 await page.locator('#lake').click({position:p});
}
export async function attachBow(page,target=null){await openBollard(page,target);await page.locator('#map-ropes [data-cleat=bow]').click();}
