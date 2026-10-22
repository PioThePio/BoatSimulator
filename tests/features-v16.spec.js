import {test,expect} from '@playwright/test';

test('wind and current have independent arrows even when wind is calm',async({page})=>{
 await page.goto('/');await page.locator('#current').fill('0.6');await page.locator('#current-min').fill('0.6');await page.locator('#current-dir').selectOption('180');await page.locator('#spatial-effects').uncheck();await page.locator('#begin-session').click();await expect(page.locator('#current-arrow')).toHaveAttribute('style',/rotate\(180deg\)/);await expect(page.locator('#current-speed')).toHaveText('0.60 m/s');await expect(page.locator('#wind-speed')).toHaveText('0.0 m/s');await expect(page.locator('#wind-indicator svg')).toHaveCount(2);expect(await page.locator('#current-arrow').evaluate(el=>getComputedStyle(el).opacity)).toBe('1');
});

test('keyboard steering rate changes live and persists after reload without steering recentering itself',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#begin-session').click();await page.locator('#steering-settings-open').click();await page.locator('#steering-rate-boat').fill('0.5');await page.locator('#steering-settings-close').click();await page.locator('#wheel').focus();await page.keyboard.down('d');await page.clock.runFor(400);await page.keyboard.up('d');const slow=+(await page.locator('#wheel').getAttribute('aria-valuenow'));await page.clock.runFor(200);await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow',String(slow));await page.keyboard.press('c');
 await page.locator('#steering-settings-open').click();await page.locator('#steering-rate-boat').fill('2');await page.locator('#steering-settings-close').click();await page.locator('#wheel').focus();await page.keyboard.down('d');await page.clock.runFor(400);await page.keyboard.up('d');const fast=+(await page.locator('#wheel').getAttribute('aria-valuenow'));expect(fast).toBeGreaterThan(slow*2.5);
 await page.reload();await page.locator('#begin-session').click();await page.locator('#steering-settings-open').click();await expect(page.locator('#steering-rate-boat')).toHaveValue('2');await expect(page.locator('#steering-rate-value-boat')).toHaveText('×2.0');
});

test('winch has separate attachment and hold-to-reel controls; Space on the winch does not release the SUV handbrake',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#trailer-straps').click();await page.clock.runFor(300);await expect(page.locator('#winch-connect')).toHaveText('Odłącz wciągarkę');await expect(page.locator('#winch-pull')).toBeEnabled();await page.locator('#car-handbrake').click();await page.locator('#winch-pull').focus();await page.keyboard.down('Space');await page.clock.runFor(100);await page.keyboard.up('Space');await expect(page.locator('#car-handbrake')).toHaveAttribute('aria-pressed','true');
 await page.locator('#winch-connect').click();await page.clock.runFor(150);await expect(page.locator('#winch-pull')).toBeDisabled();await expect(page.locator('#winch-status')).toContainText('Lina odpięta');await page.locator('#winch-connect').click();await page.clock.runFor(150);await expect(page.locator('#winch-pull')).toBeEnabled();expect(errors).toEqual([]);
});

test('restraints can be secured again while the boat engine is running',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('[data-vehicle=boat]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.clock.runFor(1400);await expect(page.locator('#key-state-0')).toHaveText('Pracuje');await page.locator('[data-vehicle=suv]').click();await page.locator('#trailer-straps').click();await page.clock.runFor(400);await page.locator('#trailer-straps').click();await page.clock.runFor(200);await expect(page.locator('#trailer-straps')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#key-state-0')).toHaveText('Pracuje');
});

test('mooring diagram and live bars consistently show rope tension',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();await page.locator('#bollard-bow').selectOption('4');await page.locator('[data-rope=bow][data-action=attach]').click();await page.clock.runFor(150);await expect(page.locator('#load-bow')).toHaveAttribute('data-load','slack');await expect(page.locator('#load-bow')).toContainText('Za luźna');await expect(page.locator('.load-legend')).toContainText('Kolor knagi i paska pokazuje napięcie');
});

test('swamp boat has single air propulsion with no tilt or reverse and an air-propeller status',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#craft').selectOption('swamp');await expect(page.locator('#propulsion')).toHaveValue('air');await expect(page.locator('#engine-count')).toBeDisabled();await page.locator('#begin-session').click();await expect(page.locator('[data-trim="1"]')).toBeDisabled();await expect(page.locator('#prop-water-state')).toContainText('Śmigło powietrzne');await expect(page.locator('#throttle')).toHaveAttribute('min','0');await page.locator('#wheel').focus();await page.keyboard.press('s');await expect(page.locator('#throttle')).toHaveValue('0');await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.locator('#lake').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/boat-v16-airboat.png',fullPage:false});expect(errors).toEqual([]);
});

test('SUV mode exposes land repairs and the independent incline gauge; all new controls fit a phone',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:1000});await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await expect(page.locator('#car-incline-value')).toHaveText('0.0°');await expect(page.locator('#repair')).toBeEnabled();await expect(page.locator('#repair')).toContainText('stanowisku');await page.locator('#repair').click();await expect(page.locator('#toast')).toContainText('dwóch stanowisk');await page.locator('#steering-settings-open').click();await expect(page.locator('#steering-settings')).toBeVisible();await page.locator('#steering-settings-close').click();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v16-phone.png',fullPage:true});expect(errors).toEqual([]);
});

test('rendered wheel slip is broadband sound, and stops when wheels stop spinning',async({page})=>{
 await page.goto('/');const levels=await page.evaluate(async()=>{
  const {createBoat}=await import('/src/physics.js'),{createTowRig,towAudioBoat}=await import('/src/towing.js'),{createSoundscape}=await import('/src/sound.js');
  async function sample(spin){const b=createBoat('lake',{coldStart:true}),r=createTowRig(b);r.tyreSlip=spin;const ctx=new OfflineAudioContext(2,48000,48000),s=createSoundscape({context:ctx});s.setEngineVolume(0);s.update(towAudioBoat(r,b),{},true);const data=(await ctx.startRendering()).getChannelData(0);let sum=0;for(let i=24000;i<data.length;i++)sum+=data[i]**2;return Math.sqrt(sum/24000);}
  return{spinning:await sample(.7),stopped:await sample(0)};
 });expect(levels.spinning).toBeGreaterThan(.0002);expect(levels.stopped).toBeLessThan(.000001);
});
