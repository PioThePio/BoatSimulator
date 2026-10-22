import {test,expect} from '@playwright/test';

test('SUV pedals have real-car order and progressive pressure, Space toggles parking brake, Q/E selects gears',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();
 const brake=await page.locator('#car-brake').boundingBox(),gas=await page.locator('#car-gas').boundingBox();expect(brake.x).toBeLessThan(gas.x);
 await page.keyboard.press('Space');await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');await page.clock.runFor(300);await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('Space');await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','false');
 for(const gear of ['R','N','D']){await page.keyboard.press('e');await page.clock.runFor(120);await expect(page.locator('[data-car-gear='+gear+']')).toHaveAttribute('aria-pressed','true');}await page.keyboard.press('q');await expect(page.locator('[data-car-gear=N]')).toHaveAttribute('aria-pressed','true');
 await page.keyboard.down('w');await page.clock.runFor(100);expect(+(await page.locator('#car-gas').inputValue())).toBeGreaterThan(0);expect(+(await page.locator('#car-gas').inputValue())).toBeLessThan(30);await page.keyboard.up('w');await page.clock.runFor(150);await expect(page.locator('#car-gas')).toHaveValue('0');expect(errors).toEqual([]);
});

test('trailer can be unhitched in the UI and SUV switches to its solo mass/profile; 4x4 has an explicit toggle',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#trailer-hitch').click();await page.clock.runFor(150);await expect(page.locator('#tow-summary')).toContainText('odczepiona');await expect(page.locator('#tow-mass')).toHaveText('2400 kg');await expect(page.locator('#tow-profile')).toContainText('SUV solo');
 await page.locator('#car-awd').click();await expect(page.locator('#car-awd')).toHaveAttribute('aria-pressed','true');await page.locator('#car-awd').click();await expect(page.locator('#car-awd')).toHaveAttribute('aria-pressed','false');await page.locator('#trailer-hitch').click();await page.clock.runFor(150);await expect(page.locator('#tow-summary')).toContainText('na haku');
});

test('loaded boat begins with full tilt and a bow line, may start its engine, and has the trailer in its own side profile',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.keyboard.press('v');await expect(page.locator('#trim-value')).toHaveText('100%');await expect(page.locator('#rope-bow')).toContainText('PRZ');await expect(page.locator('.boat-trailer-profile')).toBeVisible();await expect(page.locator('#boat-support-load')).toContainText('kg');await expect(page.locator('.boat-trailer-profile [data-profile-body=trailer]')).toHaveCount(1);
 await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.clock.runFor(1600);await expect(page.locator('#key-state-0')).toHaveText('Pracuje');await expect(page.locator('#engine-warning')).toContainText('chłodzenia');await expect(page.locator('#hull-value')).toHaveText('100%');expect(errors).toEqual([]);
});

test('whole-body SUV and trailer pitch transforms are independent and pressure is displayed on the ramp',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('retrieve');await page.locator('#begin-session').click();await page.locator('[data-vehicle=suv]').click();await expect(page.locator('#tow-profile [data-profile-body=suv]')).toHaveCount(1);const car=await page.locator('#tow-profile [data-profile-body=suv]').getAttribute('data-pitch'),trailer=await page.locator('#tow-profile [data-profile-body=trailer]').getAttribute('data-pitch');expect(Math.abs(+car-+trailer)).toBeGreaterThan(.5);await expect(page.locator('#trailer-load')).toHaveText(/kg/);await expect(page.locator('#trailer-stern-lift')).toHaveText(/%/);await page.locator('#tow-profile').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/boat-v14-ramp-console.png',fullPage:false});
});

test('car ignition is silent in rendered audio while boat ignition keeps its continuous tone',async({page})=>{
 await page.goto('/');const levels=await page.evaluate(async()=>{
  const {createBoat}=await import('/src/physics.js'),{createTowRig,towAudioBoat}=await import('/src/towing.js'),{createSoundscape}=await import('/src/sound.js');
  async function render(car){const b=createBoat('lake',{coldStart:true}),r=createTowRig(b);b.engines[0].key=r.engine.key='ignition';const ctx=new OfflineAudioContext(2,48000,48000),s=createSoundscape({context:ctx});s.update(car?towAudioBoat(r,b):b,{},true);const data=(await ctx.startRendering()).getChannelData(0);let sum=0;for(let i=24000;i<data.length;i++)sum+=data[i]**2;return Math.sqrt(sum/24000);}
  return{car:await render(true),boat:await render(false)};
 });expect(levels.car).toBeLessThan(.000001);expect(levels.boat).toBeGreaterThan(.003);
});

test('phone fits the new handbrake, drive selector and separate immersion profile',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#car-handbrake').scrollIntoViewIfNeeded();await expect(page.locator('#car-handbrake')).toBeVisible();await page.locator('#car-handbrake').click();await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v14-phone.png',fullPage:true});
});
