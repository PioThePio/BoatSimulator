import {openFuel} from './helpers/fuel.js';
import {attachBow,openBollard} from './helpers/mooring.js';
import {test,expect} from '@playwright/test';
async function hold(page,locator,ms=500){await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(ms);await page.mouse.up();await page.waitForTimeout(130);}
async function selectNearBollard(page){const r=await page.locator('#lake').boundingBox(),scale=Math.min(r.width/140,r.height/80);await page.locator('#lake').click({position:{x:r.width/2+(29-24.3)*scale,y:r.height/2+(17-22)*scale}});return r;}
test('PWC has short wheel travel and faster held throttle; arrows on ignition control never turn the key',async({page})=>{
 await page.goto('/');await page.locator('#craft').selectOption('pwc');await expect(page.locator('#steering-limit')).toHaveCount(0);await page.locator('#begin-session').click();await expect(page.locator('#wheel')).toHaveAttribute('data-travel','0.25');await expect(page.locator('#wheel-travel')).toContainText('90°');await expect(page.locator('#raise-engines')).toHaveCount(0);
 await page.locator('#ignition-0 [data-key-turn="1"]').click();await expect(page.locator('#key-state-0')).toHaveText('Zapłon');await page.locator('#key-0').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await expect(page.locator('#key-state-0')).toHaveText('Zapłon');await page.keyboard.down('ArrowUp');await page.waitForTimeout(1050);await page.keyboard.up('ArrowUp');expect(+(await page.locator('#throttle').inputValue())).toBeGreaterThan(90);await expect(page.locator('#key-state-0')).toHaveText('Zapłon');await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');
 await page.locator('#open-settings').click();await page.locator('#craft').selectOption('cabin');await page.locator('#begin-session').click();await expect(page.locator('#wheel')).toHaveAttribute('data-travel','3');await expect(page.locator('#wheel')).toHaveAttribute('aria-valuemax','45');
});
test('mooring popup opens beside the boat on desktop and phone without covering its hull',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();const lake=await selectNearBollard(page);await expect(page.locator('#mooring-picker')).toBeVisible();const panel=await page.locator('#mooring-picker').boundingBox();
  const boatX=lake.x+(width<650?48:lake.width/2);expect(panel.x).toBeGreaterThan(boatX+8);expect(panel.x+panel.width).toBeLessThanOrEqual(lake.x+lake.width);await page.screenshot({path:`/tmp/boat-v9-mooring-${width}.png`,fullPage:false});
 }
});
test('rope buttons work only while held, release instantly and stop when focus is lost',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();await attachBow(page);
 const info=page.locator('#map-rope-bow'),length=async()=>+(await info.innerText()).match(/([\d.]+) m/)[1],before=await length();await hold(page,page.locator('#map-ropes [data-action=shorten]'),1000);const after=await length();expect(after).toBeLessThan(before);await expect(info).not.toContainText('ręka');await page.waitForTimeout(500);expect(await length()).toBe(after);
 const plus=page.locator('#map-ropes [data-action=loosen]');await plus.focus();await page.keyboard.down('Enter');await page.waitForTimeout(350);await page.keyboard.up('Enter');await page.waitForTimeout(120);const loose=await length();expect(loose).toBeGreaterThan(after);await page.waitForTimeout(350);expect(await length()).toBe(loose);
 const r=await plus.boundingBox();await page.mouse.move(r.x+10,r.y+10);await page.mouse.down();await page.waitForTimeout(150);await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.mouse.up();await page.waitForTimeout(150);const stopped=await length();await page.waitForTimeout(400);expect(await length()).toBe(stopped);
});
test('weather has two endpoints per strength slider, independent direction ranges and steady shortcut',async({page})=>{
 await page.goto('/');await page.locator('#wind').fill('10');await page.locator('#wind-min').fill('6');await page.locator('#current').fill('1.1');await page.locator('#current-min').fill('0.4');await page.locator('#wind-dir-variation').fill('35');await page.locator('#current-dir-variation').fill('20');
 await expect(page.locator('#wind-value')).toHaveText('6.0–10.0 m/s');await expect(page.locator('#current-value')).toHaveText('0.40–1.10 m/s');await expect(page.locator('#wind-direction-value')).toHaveText('±35°');await expect(page.locator('#current-direction-value')).toHaveText('±20°');
 await page.locator('#begin-session').click();await expect(page.locator('#weather-open')).toHaveText('☀ Pogoda');await page.locator('#weather-open').click();await expect(page.locator('#wind-min')).toHaveValue('6');await page.locator('[data-steady=wind]').click();await expect(page.locator('#wind-value')).toHaveText('10.0 m/s');await expect(page.locator('#wind-direction-value')).toHaveText('±35°');
 await page.locator('#wind-min').focus();await page.keyboard.press('ArrowLeft');await expect(page.locator('#wind-min')).toHaveValue('9.5');await expect(page.locator('#wind-value')).toHaveText('9.5–10.0 m/s');await page.screenshot({path:'/tmp/boat-v9-weather.png',fullPage:false});
});
test('fuel requires tying to the fuel pier and detaching stops filling',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('fuel');await page.locator('#begin-session').click();await openFuel(page);await page.locator('#refuel').click();await expect(page.locator('#toast')).toContainText('Przywiąż');await expect(page.locator('#fuel-status')).not.toContainText('TANKOWANIE');
 await attachBow(page);await openFuel(page);await page.locator('#refuel').click();await expect(page.locator('#fuel-status')).toContainText('TANKOWANIE');await page.locator('#fuel-close').click();await openBollard(page);await page.locator('[data-action=detach][data-rope=bow]').click();await expect(page.locator('#fuel-status')).toContainText('przerwane');
});
test('synthesised engine audio contains signal, rises with RPM and respects mute and pause',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(rpm,enabled=true,active=true){
   const ctx=new OfflineAudioContext(2,38400,48000),sound=createSoundscape({context:ctx}),b=createBoat('open');b.engines[0].rpm=rpm;b.engines[0].n=Math.max(0,(rpm-750)/4750);sound.setEnabled(enabled);sound.update(b,{},true);if(!active)sound.setActive(false);const audio=await ctx.startRendering(),data=audio.getChannelData(0);let energy=0,crossings=0,peak=0;
   for(let i=19200;i<data.length;i++){energy+=data[i]**2;peak=Math.max(peak,Math.abs(data[i]));if(i>19200&&data[i]*data[i-1]<0)crossings++;}return{rms:Math.sqrt(energy/19200),crossings,peak};
  }
  return{idle:await render(750),fast:await render(4500),muted:await render(4500,false),paused:await render(4500,true,false)};
 });
 expect(result.idle.rms).toBeGreaterThan(.0001);expect(result.fast.rms).toBeGreaterThan(.0001);expect(result.fast.crossings).toBeGreaterThan(result.idle.crossings*2);expect(result.fast.peak).toBeLessThan(.6);expect(result.muted.rms).toBeLessThan(.000001);expect(result.paused.rms).toBeLessThan(.000001);
});
test('sound unlocks after a gesture, volume and mute persist across reloads',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await expect(page.locator('#sound-toggle')).toHaveAttribute('data-state','running');await page.locator('#sound-volume').fill('25');await page.locator('#sound-toggle').uncheck();await expect(page.locator('#sound-toggle')).toHaveAttribute('data-state','muted');
 await page.reload();await page.locator('#begin-session').click();await expect(page.locator('#sound-volume')).toHaveValue('25');await expect(page.locator('#sound-toggle')).not.toBeChecked();await page.locator('#sound-toggle').check();await expect(page.locator('#sound-toggle')).toHaveAttribute('data-state','running');expect(errors).toEqual([]);
});
test('unsupported Web Audio leaves the simulator usable',async({page})=>{
 await page.addInitScript(()=>{window.AudioContext=undefined;window.webkitAudioContext=undefined;});await page.goto('/');await page.locator('#begin-session').click();await expect(page.locator('#sound-status')).toHaveText('Dźwięk niedostępny');await page.locator('#wheel').focus();await page.keyboard.press('ArrowUp');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');
});
test('both endpoints of the shared weather slider can be dragged with a finger',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 try{
  const page=await context.newPage();await page.goto('http://127.0.0.1:5173/');await page.locator('#wind').fill('10');await page.locator('#wind-min').fill('4');
  const session=await context.newCDPSession(page);
  async function drag(selector,delta,offset){const input=page.locator(selector);await input.scrollIntoViewIfNeeded();const r=await input.boundingBox(),value=+(await input.inputValue()),x=r.x+9+(r.width-18)*value/15+offset,y=r.y+r.height/2;await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+delta,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
  await drag('#wind-min',35,-5);expect(+(await page.locator('#wind-min').inputValue())).toBeGreaterThan(4);await drag('#wind',-25,5);expect(+(await page.locator('#wind').inputValue())).toBeLessThan(10);expect(+(await page.locator('#wind-min').inputValue())).toBeLessThanOrEqual(+(await page.locator('#wind').inputValue()));
 }finally{await context.close();}
});
