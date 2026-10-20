import {test,expect} from '@playwright/test';
test('keyboard, persistent steering, neutral and pause work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await expect(page.locator('h1')).toContainText('Masz czas');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
 const angle=await page.locator('#wheel').getAttribute('aria-valuenow');expect(+angle).toBeGreaterThan(5);await page.waitForTimeout(250);await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow',angle);
 await page.keyboard.press('c');await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow','0');
 await page.keyboard.down('w');await page.waitForTimeout(1000);await page.keyboard.up('w');await expect(page.locator('#gear')).toContainText('NAPRZÓD');
 await page.waitForTimeout(1000);expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(.2);
 await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(.1);
 await page.keyboard.press('p');await expect(page.locator('#paused-label')).toBeVisible();const speed=await page.locator('#speed').innerText();await page.waitForTimeout(300);await expect(page.locator('#speed')).toHaveText(speed);
 await page.screenshot({path:'/tmp/boat-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('mouse controls, environment and mooring are usable',async({page})=>{
 await page.goto('/');await page.locator('[data-start="berth"]').click();
 await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('m');
 await page.waitForTimeout(150);const ropeLength=async()=>+(await page.locator('#rope-bow').innerText()).match(/([\d.]+) m/)[1];const before=await ropeLength();await page.locator('[data-action="shorten"][data-rope="bow"]').click();expect(await ropeLength()).toBeGreaterThan(before-.1);await page.waitForTimeout(1100);expect(await ropeLength()).toBeLessThan(before);
 await page.locator('[data-action="detach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toHaveText('niepołączona');
 await page.locator('#fenders').uncheck();await expect(page.locator('#fenders')).not.toBeChecked();
 await page.locator('#preset').selectOption('crosswind');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');await page.locator('#preset').selectOption('gusty');await expect(page.locator('#wind-value')).toHaveText('8.0 m/s');await expect(page.locator('#gusts')).toBeChecked();
 const r=await page.locator('#wheel').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+60,r.y+r.height/2);await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(10);
 await page.locator('#throttle').fill('40');await expect(page.locator('#gear')).toContainText('40%');await page.locator('#neutral').click();await expect(page.locator('#gear')).toContainText('LUZ');
 await page.locator('#limits').click();await expect(page.locator('#info')).toBeVisible();await expect(page.locator('#info')).toContainText('umowne progi dydaktyczne');await page.keyboard.press('Escape');await expect(page.locator('#info')).not.toBeVisible();
});
test('mobile layout fits viewport and renders map',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#lake')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('#help').click();await expect(page.locator('#info')).toBeVisible();await page.locator('#close-dialog').click();await page.screenshot({path:'/tmp/boat-mobile.png',fullPage:true});
});
test('custom vessel, independent twin throttles, linking and keyboard selection',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');
 await page.locator('#craft').selectOption('cabin');await expect(page.locator('#boat-length')).toHaveValue('7.5');await expect(page.locator('#boat-beam')).toHaveValue('2.65');
 await page.locator('#engine-count').selectOption('2');await page.locator('#power-left').fill('115');await page.locator('#power-right').fill('90');await page.locator('#apply-craft').click();
 await expect(page.locator('#second-engine')).toBeVisible();await expect(page.locator('.bottom-note')).toContainText('115 + 90 KM');
 await page.locator('#link-engines').uncheck();await page.locator('#throttle').fill('55');await page.locator('#throttle2').fill('-55');
 await expect(page.locator('#gear')).toContainText('NAPRZÓD');await expect(page.locator('#gear2')).toContainText('WSTECZ');
 await page.waitForTimeout(1900);await expect(page.locator('#engine-state')).toContainText('L:');await expect(page.locator('#engine-state')).toContainText('P:');
 await page.locator('#link-engines').check();await expect(page.locator('#throttle2')).toHaveValue('55');
 await page.locator('h1').click();await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');await expect(page.locator('#gear2')).toContainText('LUZ');
 await page.keyboard.press('t');await page.keyboard.press('2');await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');
 await expect(page.locator('#throttle')).toHaveValue('0');expect(+(await page.locator('#throttle2').inputValue())).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('select bollard explicitly, sonar updates, anchor windlass starts and stops',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('[data-start="berth"]').click();
 await page.locator('#bollard-bow').selectOption('4');await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('P5');
 const near=+(await page.locator('#depth').innerText()).replace('m','').trim();await page.locator('[data-start="open"]').click();
 const deep=+(await page.locator('#depth').innerText()).replace('m','').trim();expect(deep).toBeGreaterThan(near+.5);
 await page.locator('#auto-waves').uncheck();await page.locator('#waves').fill('0.3');await expect(page.locator('#wave-value')).toHaveText('0.30 m');
 await page.locator('#anchor-target').fill('15');await page.locator('#anchor-lower').click();await page.waitForTimeout(1000);expect(parseFloat(await page.locator('#anchor-length').innerText())).toBeGreaterThan(.3);
 await page.locator('#anchor-hold').click();await page.waitForTimeout(150);const length=await page.locator('#anchor-length').innerText();await page.waitForTimeout(250);await expect(page.locator('#anchor-length')).toHaveText(length);
 await expect(page.locator('#anchor-profile')).toBeVisible();expect(errors).toEqual([]);
});
