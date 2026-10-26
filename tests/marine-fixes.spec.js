import {test,expect} from '@playwright/test';
import {openFuel} from './helpers/fuel.js';

test('with master OFF the key visibly turns I/START then returns to I, with no RPM or battery draw',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#begin-session').click();await page.locator('#power-master').uncheck();await page.locator('[data-key-turn="1"][data-engine="0"]').click();await expect(page.locator('#key-state-0')).toHaveText('Zapłon');await page.locator('[data-key-turn="1"][data-engine="0"]').click();
 expect(await page.locator('#key-0 .key-pointer').evaluate(e=>e.style.transform)).toContain('48deg');await page.clock.runFor(800);expect(await page.locator('#key-0 .key-pointer').evaluate(e=>e.style.transform)).toContain('0deg');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 const b=await page.evaluate(()=>JSON.parse(localStorage.getItem('przystan-session-v1')).fleet.boats[0]);expect(b.engines[0].rpm).toBe(0);expect(b.engines[0].key).toBe('ignition');expect(b.battery.loadCurrent).toBe(0);
 await page.locator('#power-master').check();await page.clock.runFor(1600);await expect(page.locator('#key-state-0')).toHaveText('Zapłon');
});

test('setup and Fleet choose fuel litres against a fixed capacity and the gauge really shows half a tank after Continue',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#craft').selectOption('racing');await expect(page.locator('#fuel-capacity-info')).toHaveText('Zbiornik 450 l');await expect(page.locator('#fuel-capacity')).toHaveAttribute('max','450');await page.locator('#fuel-capacity').fill('225');await page.locator('#begin-session').click();await page.clock.runFor(200);
 await expect(page.locator('#gauge-fuel>strong')).toHaveText('225.0 l');expect(await page.locator('#gauge-fuel .needle').evaluate(e=>e.style.transform)).toBe('rotate(90deg)');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));await page.reload();await page.locator('#continue-session').click();await expect(page.locator('#gauge-fuel>strong')).toHaveText('225.0 l');
 await page.locator('#fleet-open').click();await page.locator('#fleet-kind').selectOption('cabin');await expect(page.locator('#fleet-fuel-capacity-info')).toHaveText('Zbiornik 250 l');await page.locator('#fleet-fuel').fill('125');await page.locator('#fleet-location').selectOption('lake');await page.locator('#fleet-place').click();await page.locator('[data-fleet-switch]').last().click();await page.clock.runFor(200);await expect(page.locator('#gauge-fuel>strong')).toHaveText('125.0 l');expect(errors).toEqual([]);
});

test('detached trailer has its own reset button which recovers it on land and preserves the SUV and boat positions',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.clock.runFor(200);await page.locator('#trailer-hitch').click();await expect(page.locator('#trailer-hitch')).toHaveText('Przyczep przyczepę');await expect(page.locator('#trailer-reset')).toBeVisible();await page.locator('#trailer-reset').click();await page.clock.runFor(800);await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('przystan-session-v1')));expect(s.rig.attached).toBe(false);expect(s.rig.trailerPark).toBe(true);expect(s.rig.trailer.x).toBeCloseTo(151,2);expect(s.rig.car.x).toBeCloseTo(124.5,2);expect(s.rig.car.y).toBeCloseTo(-32,2);expect(s.rig.trailer.w).toBeCloseTo(0,3);
});

test('clicking the angled Nieporęt station permits actual tanking with its own shore line',async({page})=>{
 await page.clock.install();await page.goto('/');await page.evaluate(async()=>{
  const {NIEPORET,BOLLARDS}=await import('/src/world.js'),{fuelPoint,fuelFrame}=await import('/src/fuel-geometry.js'),{createBoat}=await import('/src/physics.js'),{attachRope}=await import('/src/rigging.js'),{createFleet}=await import('/src/fleet.js'),{snapshotSession}=await import('/src/session-save.js');
  const b=createBoat('nieporet',{coldStart:true,initialFuelLitres:40}),f=NIEPORET.fuel,frame=fuelFrame(f);Object.assign(b,{...fuelPoint(f,0,b.spec.beam/2+.45),a:Math.atan2(frame.ty,frame.tx)});attachRope(b,'bow',BOLLARDS.findIndex(q=>q.id==='PIL-F-4'));localStorage.setItem('przystan-session-v1',JSON.stringify(snapshotSession({fleet:createFleet(b),env:{traffic:false},start:'nieporet',vehicle:'boat',ui:{follow:true,overview:false}})));
 });await page.reload();await page.locator('#continue-session').click();await openFuel(page);await expect(page.locator('#fuel-menu-state')).toContainText('gotowe');await page.locator('#refuel').click();await page.locator('#pause').click();await page.clock.runFor(1600);await expect(page.locator('#fuel-menu-level')).toContainText('TANKOWANIE');await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));const litres=await page.evaluate(()=>JSON.parse(localStorage.getItem('przystan-session-v1')).fleet.boats[0].fuel.litres);expect(litres).toBeGreaterThan(40.5);
});

test('offline audio renders a distinct broadband blow-off on lift-off, quieter steady turbo and pulsating diesel knock',async({page})=>{
 await page.goto('/');const r=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js'),{updateEngine}=await import('/src/craft.js');
  async function render(kind){
   const context=new OfflineAudioContext(2,72000,48000),sound=createSoundscape({context}),diesel=kind==='diesel',b=createBoat('lake',{profile:diesel?'cabin':'racing',propulsion:'zdrive',engineType:diesel?'diesel':'petrol'});
   for(const en of b.engines){en.gear=1;for(let i=0;i<1200;i++)updateEngine(en,1,0,1/120,0,{racing:!diesel,engineType:b.spec.engineType});}b.throttle=b.throttle2=1;sound.update(b,{},true);
   const at=context.suspend(.5),rendered=context.startRendering();await at;
   if(kind==='bov'){b.throttle=b.throttle2=0;for(let i=0;i<30;i++)for(const en of b.engines)updateEngine(en,0,0,1/120,0,{racing:true});}sound.update(b,{},true);await context.resume();const data=(await rendered).getChannelData(0);
   const bands=(lo,hi)=>{let e=0,high=0,peak=0;for(let i=lo;i<hi;i++){e+=data[i]**2;high+=(data[i]-data[i-1])**2;peak=Math.max(peak,Math.abs(data[i]));}return{rms:Math.sqrt(e/(hi-lo)),high:Math.sqrt(high/(hi-lo)),peak};};return{before:bands(12000,21600),event:bands(24500,36000),late:bands(57600,67200)};
  }
  return{steady:await render('steady'),release:await render('bov'),diesel:await render('diesel')};
 });expect(r.release.event.high).toBeGreaterThan(r.steady.event.high*2);expect(r.release.event.peak).toBeGreaterThan(r.steady.event.peak*1.3);expect(r.release.late.high).toBeLessThan(r.release.event.high*.5);expect(r.diesel.before.rms).toBeGreaterThan(.0001);expect(r.diesel.before.peak/r.diesel.before.rms).toBeGreaterThan(2);expect(r.release.event.peak).toBeLessThan(.8);
});
