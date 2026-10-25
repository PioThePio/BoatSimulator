// Click the station's visible pump in the real map projection.
export async function openFuel(page){
 if(await page.locator('#fuel-picker').isVisible())return;
 if(await page.locator('#mooring-picker').isVisible())await page.locator('#close-mooring').click();
 const p=await page.evaluate(async()=>{
  window.dispatchEvent(new Event('pagehide'));
  const{restoreSession}=await import('/src/session-save.js'),{renderWorld}=await import('/src/render.js'),{FUEL_STATIONS}=await import('/src/world.js');
  const s=restoreSession(localStorage.getItem('przystan-session-v1')).session,b=s.fleet.boats.find(q=>q.id===s.fleet.activeId),r=document.querySelector('#lake').getBoundingClientRect(),c=document.createElement('canvas');c.width=r.width;c.height=r.height;
  const view=renderWorld(c.getContext('2d'),{...s.ui,boat:b,env:s.env,width:r.width,height:r.height,fleet:s.fleet}),q=FUEL_STATIONS.reduce((a,q)=>Math.hypot(q.x-b.x,q.y-b.y)<Math.hypot(a.x-b.x,a.y-b.y)?q:a);
  return{x:r.width/2+(q.pumpX-view.camera.x)*view.scale,y:r.height/2+(q.pumpY-view.camera.y)*view.scale};
 });await page.locator('#lake').click({position:p});
}
