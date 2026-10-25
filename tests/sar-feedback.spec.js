import {test,expect} from '@playwright/test';
import {attachBow} from './helpers/mooring.js';
async function load(page,mode){
 await page.goto('/');await page.evaluate(async mode=>{
  const {createBoat}=await import('/src/physics.js'),{createFleet}=await import('/src/fleet.js'),{throwRescue}=await import('/src/rescue-scene.js'),{snapshotSession}=await import('/src/session-save.js');
  const b=createBoat('lake',{coldStart:true}),f=createFleet(b);f.logbookId='sar-feedback';
  if(mode==='ground')Object.assign(b,{groundLoad:4905,grounded:true});
  if(mode==='reeds'){b.reeds=.8;b.engines[0].key='running';b.engines[0].cooling=.65;b.engines[0].clock=2;b.engines[0].trim=0;}
  if(mode==='sar'||mode==='far'){
   const o=throwRescue(f,b,'mob').object;Object.assign(o,{x:mode==='far'?b.x+10:b.x,y:mode==='far'?b.y:b.y+2,vx:0,vy:0});
   if(mode==='far')b.vx=1;
   else{f.time=b.time=12;o.contactMetrics={[b.id]:{peakForce:300,peakSpeed:.4,contacts:1,inGear:false,lastAt:10}};b.engines[0].key='running';b.engines[0].cooling=.65;}
  }
  localStorage.setItem('przystan-session-v1',JSON.stringify(snapshotSession({fleet:f,env:{traffic:false,windSpeed:0,currentSpeed:0,waveHeight:0},start:'lake',vehicle:'boat'})));
 },mode);await page.reload();await page.locator('#continue-session').click();
}
test('physical bottom load stays visible beside draft after a saved grounded state, and bottom mooring controls are removed',async({page})=>{
 await load(page,'ground');await expect(page.locator('#ground-pressure')).toHaveText('500 kg');await expect(page.locator('#ground-pressure')).toBeVisible();expect(await page.locator('#ground-pressure').evaluate(e=>!!e.closest('.attitude-column'))).toBe(true);await expect(page.locator('#settings .mooring,#ropes,#bollard-bow')).toHaveCount(0);await page.waitForTimeout(300);await expect(page.locator('#ground-pressure')).toHaveText('500 kg');
});
test('reed warning is on the bottom of the map between sonar and zoom on desktop and phone without a false cooling instruction',async({page})=>{
 for(const width of [1153,390]){await page.setViewportSize({width,height:1100});await load(page,'reeds');const warning=page.locator('#engine-warning');await expect(warning).toBeVisible();await expect(warning).toContainText('Szuwary');await expect(warning).not.toContainText('chłodzenia');
  const [w,s,z,map,stack]=await Promise.all([warning,page.locator('.sonar'),page.locator('.map-controls'),page.locator('#lake'),page.locator('.map-alert-stack')].map(q=>q.boundingBox()));expect(w.x).toBeGreaterThanOrEqual(s.x+s.width+5);expect(w.x+w.width).toBeLessThan(z.x-5);expect(map.y+map.height-stack.y-stack.height).toBeLessThan(16);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);if(width===390)await page.screenshot({path:'/tmp/boat-sar-warning-phone.png'});
 }
});
test('SAR card displays signed closing speed, distance and relative speed, and distant recovery is disabled',async({page})=>{
 await load(page,'far');await expect(page.locator('#rescue-map')).toBeVisible();await expect(page.locator('#rescue-closing')).toHaveText('+3.60 km/h');await expect(page.locator('#rescue-relative')).toHaveText('3.60 km/h');await expect(page.locator('#rescue-distance')).toHaveText('7.3 m');await expect(page.locator('#rescue-map-pickup')).toBeDisabled();
 const line=await page.evaluate(async()=>{const {createBoat}=await import('/src/physics.js'),{createFleet}=await import('/src/fleet.js'),{throwRescue}=await import('/src/rescue-scene.js'),{drawRescue}=await import('/src/render-rescue.js');const b=createBoat('lake',{coldStart:true}),f=createFleet(b),first=throwRescue(f,b).object,selected=throwRescue(f,b,'mob',-1).object;selected.x+=20;f.rescue.targetId=first.id;const ctx=document.createElement('canvas').getContext('2d'),lineTo=ctx.lineTo,lines=[];ctx.lineTo=function(x,y){if(this.strokeStyle==='#c36628')lines.push({x,y});return lineTo.call(this,x,y);};drawRescue(ctx,f,5,false,b);return{line:lines[0],object:{x:first.x,y:first.y}};});expect(line.line).toEqual(line.object);
});
test('on-map recovery stores scored SAR metrics and engine N/key state, writes Logbook, and survives Continue',async({page})=>{
 await load(page,'sar');await page.setViewportSize({width:390,height:1100});await expect(page.locator('#rescue-map-pickup')).toBeEnabled();await expect(page.locator('#rescue-contact')).toHaveText('300 N');await page.screenshot({path:'/tmp/boat-sar-pickup-phone.png'});await page.locator('#rescue-map-pickup').click();await expect(page.locator('#rescue-map-name')).toHaveText('SAR · wynik 85/100');await expect(page.locator('#rescue-map-state')).toContainText('N / pracuje');
 await page.locator('#sar-open').click();await expect(page.locator('#rescue-result')).toContainText('podjęcie 0.00 km/h');await expect(page.locator('#rescue-result')).toContainText('300 N');await page.locator('#logbook-open').click();await expect(page.locator('#logbook-events')).toContainText('Ćwiczenie SAR · podjęto');await expect(page.locator('#logbook-events')).toContainText('85/100');await page.locator('#logbook-close').click();await page.reload();await page.locator('#continue-session').click();await expect(page.locator('#rescue-map-name')).toContainText('85/100');await page.locator('#sar-open').click();await expect(page.locator('#rescue-result')).toContainText('N / pracuje');
});
test('the retained map mooring can attach and detach after removing its duplicate bottom panel',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();await attachBow(page,4);await expect(page.locator('#map-rope-bow')).toContainText('P5');await page.locator('#map-ropes [data-action=detach]').click();await expect(page.locator('[data-cleat=bow]')).toBeEnabled();await expect(page.locator('#settings .mooring')).toHaveCount(0);
});
test('closing an old SAR result does not conceal a new exercise that reuses the object number after a new trial',async({page})=>{
 await load(page,'sar');await page.locator('#rescue-map-pickup').click();await page.locator('#rescue-dismiss').click();await expect(page.locator('#rescue-map')).toBeHidden();await page.locator('#reset').click();await page.locator('#begin-session').click();await page.locator('#sar-open').click();await page.locator('#rescue-throw').click();await expect(page.locator('#rescue-map-pickup')).toBeEnabled();await page.locator('#rescue-map-pickup').click();await expect(page.locator('#rescue-map')).toBeVisible();await expect(page.locator('#rescue-map-name')).toContainText('wynik');
});
