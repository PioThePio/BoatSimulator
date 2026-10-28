import {attachBow,openBollard} from './helpers/mooring.js';
import {test,expect} from '@playwright/test';

test('engine-only volume is independent, boosts to 200 percent and persists with the master setting',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('#engine-volume').fill('200');await page.locator('#sound-volume').fill('30');await expect(page.locator('#engine-volume-value')).toHaveText('200%');
 await page.reload();await page.locator('#begin-session').click();await expect(page.locator('#engine-volume')).toHaveValue('200');await expect(page.locator('#sound-volume')).toHaveValue('30');
 const audio=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(engineVolume,kind='engine'){
   const context=new OfflineAudioContext(2,48000,48000),random=Math.random;let seed=11,sound;
   try{Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};sound=createSoundscape({context});}finally{Math.random=random;}
   const b=createBoat('lake',{powers:[200]});Object.assign(b.engines[0],{n:.7,rpm:3600,gear:1,load:.5});
   if(kind==='water'){b.telemetry.surge=12;b.planing=1;}if(kind==='reference') {b.telemetry.surge=12;b.planing=1;b.engines[0].key='off';}
   if(kind==='trim'){b.engines[0].key='off';b.engines[0].trimRate=.1;}
   sound.setEngineVolume(engineVolume);sound.update(b,{},true);const data=(await context.startRendering()).getChannelData(0);let energy=0;for(let i=24000;i<data.length;i++)energy+=data[i]**2;return Math.sqrt(energy/24000);
  }
  return{muted:await render(0),normal:await render(1),boost:await render(2),water:await render(0,'water'),reference:await render(0,'reference'),trim:await render(0,'trim')};
 });
 expect(audio.muted).toBeLessThan(.000001);expect(audio.boost).toBeGreaterThan(audio.normal*1.8);expect(audio.boost).toBeLessThan(audio.normal*2.2);expect(audio.water).toBeGreaterThan(.0001);expect(Math.abs(audio.water-audio.reference)).toBeLessThan(.000001);expect(audio.trim).toBeGreaterThan(.001);
});

test('condition diagram separates bottom, side and individual twin-drive damage',async({page})=>{
 await page.goto('/');await page.locator('#engine-count').selectOption('2');await page.locator('#begin-session').click();
 const state=await page.evaluate(async()=>{
  const {createBoat}=await import('/src/physics.js'),{recordImpact}=await import('/src/impacts.js'),{updateContactInstrument}=await import('/src/contact-instrument.js');
  const b=createBoat('lake',{engineCount:2});b.a=0;recordImpact(b,{arm:{x:2,y:0},speed:.5,effective:500,target:'bottom',dock:false,damage:3});recordImpact(b,{arm:{x:0,y:1},speed:.5,effective:500,target:'pier',damage:20});b.engines[0].propDamage=.2;b.engines[1].propDamage=75;b.time+=3;updateContactInstrument(b);
  const color=(selector,attribute)=>document.querySelector(selector).getAttribute(attribute);
  return{front:color('[data-bottom-zone=bottomBow]','fill'),mid:color('[data-bottom-zone=bottomMid]','fill'),bow:color('[data-contact-zone=bow]','stroke'),side:color('[data-contact-zone=starboardMid]','stroke'),left:color('[data-contact-propeller="0"]','fill'),right:color('[data-contact-propeller="1"]','fill')};
 });
 expect(state).toEqual({front:'#d8c36c',mid:'#e6ebd9',bow:'#8da786',side:'#df9c54',left:'#d8c36c',right:'#bf6350'});
 await expect(page.locator('[data-contact-engine="0"]')).toBeVisible();await expect(page.locator('[data-contact-engine="1"]')).toBeVisible();
});

test('soft beach grounding keeps full hull health and uses a warning rather than a red damage tag',async({page})=>{
 await page.goto('/');await page.locator('#craft').selectOption('cruiser');await page.locator('#start-location').selectOption('beach');await page.locator('#begin-session').click();await expect(page.locator('#condition-tag')).toHaveText('NA MIELIŹNIE');await expect(page.locator('#condition-tag')).not.toHaveClass(/danger/);await expect(page.locator('#hull-value')).toHaveText('100%');
});

test('service berth is reachable from the start menu and explains mooring and repair requirements',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#start-location').selectOption('service');await expect(page.locator('#start-description')).toContainText('Pomost techniczny');await page.locator('#begin-session').click();
 await page.locator('#repair').click();await expect(page.locator('#toast')).toContainText('Przycumuj');await attachBow(page,'SER22');await page.locator('#close-mooring').click();await page.locator('#repair').click();await expect(page.locator('#toast')).toContainText('nie wymagają naprawy');
 await page.locator('#lake').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/boat-v12-service.png',fullPage:false});expect(errors).toEqual([]);
});

test('phone keeps the new engine level and the bottom/drive diagram inside its viewport',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.goto('/');await page.locator('#begin-session').click();await page.locator('#engine-volume').scrollIntoViewIfNeeded();await expect(page.locator('#engine-volume')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('.condition-compact').scrollIntoViewIfNeeded();const r=await page.locator('.condition-compact').boundingBox();expect(r.x+r.width).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v12-phone.png',fullPage:false});
});
