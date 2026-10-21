import {test,expect} from '@playwright/test';

test('SUV cockpit keeps the wheel and gauges, starts from its key and drives/brakes by keyboard without changing boat throttle',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();
 await expect(page.locator('body')).toHaveAttribute('data-vehicle','suv');await expect(page.locator('#car-controls')).toBeVisible();await expect(page.locator('#first-engine')).toBeHidden();await expect(page.locator('.tow-attitude')).toBeVisible();await expect(page.locator('.pitch-gauge')).toBeHidden();
 await page.locator('#car-key-right').click();await expect(page.locator('#car-key-state')).toHaveText('Zapłon');await page.locator('#car-key-right').click();await page.clock.runFor(1500);await expect(page.locator('#car-key-state')).toHaveText('Pracuje');
 await page.keyboard.press('2');await page.keyboard.down('ArrowUp');await page.clock.runFor(1000);await page.keyboard.up('ArrowUp');expect(parseFloat(await page.locator('#speed').textContent())).toBeGreaterThan(1);await expect(page.locator('#throttle')).toHaveValue('0');await expect(page.locator('#car-key-state')).toHaveText('Pracuje');
 await page.keyboard.down('Space');await page.clock.runFor(1500);await page.keyboard.up('Space');await page.keyboard.press('1');await expect(page.locator('[data-car-gear=P]')).toHaveAttribute('aria-pressed','true');await page.keyboard.press('v');await expect(page.locator('body')).toHaveAttribute('data-vehicle','boat');await expect(page.locator('#first-engine')).toBeVisible();await expect(page.locator('#gauge-speed small')).toHaveText('kn');
 await page.keyboard.press('v');await page.locator('#car-key-left').click();await page.clock.runFor(1000);await expect(page.locator('#car-key-state')).toHaveText('Wyłączony');expect(errors).toEqual([]);
});

test('touch pedals rise and release progressively, car arrow keys do not turn the ignition, and dry restraints do not float a boat',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await page.locator('#car-key-right').click();await page.locator('#car-key').focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowRight');await expect(page.locator('#car-key-state')).toHaveText('Zapłon');
 const pedal=page.locator('[data-pedal=gas]'),box=await pedal.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.clock.runFor(200);expect(+(await page.locator('#car-gas').inputValue())).toBeGreaterThan(10);expect(+(await page.locator('#car-gas').inputValue())).toBeLessThan(60);await page.clock.runFor(700);await expect(page.locator('#car-gas')).toHaveValue('100');await page.mouse.up();await page.clock.runFor(250);await expect(page.locator('#car-gas')).toHaveValue('0');
 await page.locator('[data-trailer-action=release]').click();await page.clock.runFor(1200);await expect(page.locator('#tow-live-status')).toContainText('Zabezpieczenia zwolnione');await expect(page.locator('#tow-summary')).toContainText('z łodzią');await expect(page.locator('#hull-value')).toHaveText('100%');
});

test('wind arrow shows local live speed and destination direction; a retrieval start has a submerged trailer',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('retrieve');await page.locator('#begin-session').click();await page.locator('#switch-vehicle').click();await expect(page.locator('#tow-summary')).toContainText('pusta');await expect(page.locator('#tow-immersion-state')).toHaveText('Łódź może pływać');expect(parseFloat(await page.locator('#trailer-depth').textContent())).toBeGreaterThan(.3);
 await page.locator('#weather-open').click();await page.locator('#preset').selectOption('crosswind');await expect(page.locator('#wind-speed')).toHaveText(/\d\.\d m\/s/);await expect(page.locator('#wind-heading')).toHaveText('270° → W');await expect(page.locator('#wind-arrow')).toHaveAttribute('style',/270deg/);await page.locator('#close-weather').click();
 await page.locator('#lake').scrollIntoViewIfNeeded();await page.screenshot({path:'/tmp/boat-v13-ramp.png',fullPage:false});
});

test('slip angle is shared by setup and live controls and survives a new trial',async({page})=>{
 await page.goto('/');await page.locator('#setup-slip-angle').selectOption('12');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await expect(page.locator('#slip-angle')).toHaveValue('12');await expect(page.locator('#slip-angle-value')).toHaveText('12° · 21%');await page.locator('#slip-angle').fill('6');await page.locator('#reset').click();await expect(page.locator('#setup-slip-angle')).toHaveValue('6');await expect(page.locator('#start-location')).toHaveValue('trailer');
});

test('phone car console, wind and trailer controls fit without horizontal scrolling',async({page})=>{
 await page.setViewportSize({width:390,height:1000});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await expect(page.locator('#switch-vehicle')).toBeVisible();
 await page.locator('#car-controls').scrollIntoViewIfNeeded();await expect(page.locator('#car-controls')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);const r=await page.locator('.tow-attitude').boundingBox();expect(r.x+r.width).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v13-phone.png',fullPage:true});expect(errors).toEqual([]);
});
