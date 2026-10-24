import {test,expect} from '@playwright/test';

test('transport actions sit in propulsion; one restraint button alternates and vehicle reset keeps the current trial',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();
 await expect(page.locator('.throttle-section #trailer-straps')).toHaveCount(1);await expect(page.getByRole('button',{name:'Zwolnij zabezpieczenia',exact:true})).toHaveCount(1);
 await page.locator('#trailer-straps').click();await page.clock.runFor(300);await expect(page.locator('#trailer-straps')).toHaveText('Zabezpiecz łódź');await page.locator('#trailer-straps').click();await page.clock.runFor(300);await expect(page.locator('#trailer-straps')).toHaveText('Zwolnij zabezpieczenia');
 await page.locator('#vehicle-reset').click();await expect(page.locator('#setup-dialog')).not.toBeVisible();await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#tow-live-status')).toContainText('stan łodzi zachowany');expect(errors).toEqual([]);
});

test('a detached trailer can be reattached after the SUV actually moves and stops nearby',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#trailer-hitch').click();await page.clock.runFor(200);await expect(page.locator('#hitch-guide')).toContainText('gotowy');
 await page.locator('#car-key-right').click();await page.locator('#car-key-right').click();await page.clock.runFor(1000);await page.locator('[data-car-gear=D]').click();await page.keyboard.down('w');await page.clock.runFor(450);await page.keyboard.up('w');await page.keyboard.down('s');await page.clock.runFor(700);await page.keyboard.up('s');await page.locator('[data-car-gear=P]').click();await page.clock.runFor(200);
 const text=await page.locator('#hitch-guide').textContent();expect(parseFloat(text.match(/zaczep ([\d.]+)/)[1])).toBeGreaterThan(.05);await expect(page.locator('#hitch-guide')).toContainText('gotowy');await page.locator('#trailer-hitch').click();await page.clock.runFor(200);await expect(page.locator('#tow-summary')).toContainText('na haku');await expect(page.locator('#hitch-guide')).toBeHidden();
});

test('switching stations preserves world zoom, and the trailer mooring point has no PRZ map label',async({page})=>{
 await page.addInitScript(()=>{const original=CanvasRenderingContext2D.prototype.fillText;window.mapScales=[];window.trailerLabels=[];CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.id==='lake'){if(text==='5 m')window.mapScales.push(this.getTransform().a);if(text==='PRZ')window.trailerLabels.push(text);}return original.call(this,text,...args);};const line=CanvasRenderingContext2D.prototype.lineTo;window.scaleEndpoints=[];CanvasRenderingContext2D.prototype.lineTo=function(x,y){if(this.canvas.id==='lake'&&y===this.canvas.getBoundingClientRect().height-52&&x>22)window.scaleEndpoints.push(x);return line.call(this,x,y);};});
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#zoom-in').click();await page.clock.runFor(100);const before=await page.evaluate(()=>window.scaleEndpoints.at(-1));expect(before).toBeGreaterThan(22);
 await page.locator('[data-vehicle=boat]').click();await page.clock.runFor(100);const boat=await page.evaluate(()=>window.scaleEndpoints.at(-1));await page.locator('[data-vehicle=suv]').click();await page.clock.runFor(100);const car=await page.evaluate(()=>window.scaleEndpoints.at(-1));expect(boat).toBeCloseTo(before,5);expect(car).toBeCloseTo(before,5);expect(await page.evaluate(()=>window.trailerLabels)).toEqual([]);
});

test('live current speed and destination direction appear below wind',async({page})=>{
 await page.goto('/');await page.locator('#current').fill('0.6');await page.locator('#current-min').fill('0.6');await page.locator('#current-dir').selectOption('180');await page.locator('#spatial-effects').uncheck();await page.locator('#begin-session').click();await expect(page.locator('#current-speed')).toHaveText('0.60 m/s');await expect(page.locator('#current-heading')).toHaveText('180° → S');const wind=await page.locator('#wind-speed').boundingBox(),current=await page.locator('#current-speed').boundingBox();expect(current.y).toBeGreaterThan(wind.y);
});

test('crew, equipment and propulsion are selectable; RIB and flat hulls are available and PWC keeps fixed jet controls',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#craft').selectOption('rib');await page.locator('#crew-count').fill('5');await page.locator('#equipment-mass').fill('200');await page.locator('#begin-session').click();await page.locator('#open-settings').click();await expect(page.locator('#crew-count')).toHaveValue('5');await expect(page.locator('#equipment-mass')).toHaveValue('200');
 await page.locator('#craft').selectOption('flat');await page.locator('#begin-session').click();await expect(page.locator('#hull-draft')).toHaveText('0.23 m');await page.locator('#open-settings').click();await page.locator('#craft').selectOption('cabin');await page.locator('#propulsion').selectOption('inboard');await page.locator('#begin-session').click();await expect(page.locator('[data-trim="1"]')).toBeDisabled();await expect(page.locator('#gauge-trim small')).toHaveText('STAŁY WAŁ');
 await page.locator('#open-settings').click();await page.locator('#craft').selectOption('pwc');await expect(page.locator('#propulsion')).toBeDisabled();await page.locator('#begin-session').click();await expect(page.locator('[data-trim="1"]')).toBeDisabled();await expect(page.locator('#engine-count')).toHaveValue('1');
});

test('bilge has independent manual and auto pump switches and fits a phone cockpit',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:1000});await page.goto('/');await page.locator('#begin-session').click();await expect(page.locator('#bilge-level')).toHaveText('0%');await page.locator('#bilge-pump').click();await expect(page.locator('#bilge-pump')).toHaveText('POMPA ON');await expect(page.locator('#bilge-pump')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#bilge-pump')).toHaveAttribute('data-mode','on');await expect(page.locator('#bilge-auto')).not.toBeChecked();await page.locator('#bilge-pump').click();await expect(page.locator('#bilge-pump')).toHaveText('POMPA OFF');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v15-phone.png',fullPage:true});expect(errors).toEqual([]);
});

test('actual Web Audio renders the new starter, pump/alarm, and silence instead of gas-pedal clicks',async({page})=>{
 await page.goto('/');const result=await page.evaluate(async()=>{
  const {createBoat}=await import('/src/physics.js'),{createTowRig,towAudioBoat}=await import('/src/towing.js'),{createSoundscape}=await import('/src/sound.js');
  async function render(mode){const b=createBoat('lake',{coldStart:true}),r=createTowRig(b),ctx=new OfflineAudioContext(2,48000,48000),s=createSoundscape({context:ctx});s.setEngineVolume(mode==='pedal'?0:1);let active=b;
   if(mode==='starter'){r.engine.key='starting';r.engine.rpm=220;r.engine.startTime=.3;active=towAudioBoat(r,b);}
   if(mode==='pedal'){active=towAudioBoat(r,b);s.update(active,{},true);r.pedal=1;active=towAudioBoat(r,b);}
   if(mode==='pump'){b.bilge.running=true;}if(mode==='alarm'){b.bilge.alarm=true;}
   s.update(active,{},true);const data=(await ctx.startRendering()).getChannelData(0);let sum=0;for(let i=24000;i<data.length;i++)sum+=data[i]**2;return Math.sqrt(sum/24000);
  }
  return{starter:await render('starter'),pedal:await render('pedal'),pump:await render('pump'),alarm:await render('alarm')};
 });expect(result.starter).toBeGreaterThan(.0003);expect(result.pump).toBeGreaterThan(.0001);expect(result.alarm).toBeGreaterThan(.002);expect(result.pedal).toBeLessThan(.000001);
});
