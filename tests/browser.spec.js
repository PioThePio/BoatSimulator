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
 const before=parseFloat(await page.locator('#rope-bow').innerText());await page.locator('[data-action="shorten"][data-rope="bow"]').click();expect(parseFloat(await page.locator('#rope-bow').innerText())).toBeCloseTo(before-.25,2);
 await page.locator('[data-action="detach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toHaveText('niepołączona');
 await page.locator('#fenders').uncheck();await expect(page.locator('#fenders')).not.toBeChecked();
 await page.locator('#preset').selectOption('gusty');await expect(page.locator('#wind-value')).toHaveText('8.0 m/s');await expect(page.locator('#gusts')).toBeChecked();
 const r=await page.locator('#wheel').boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.mouse.move(r.x+r.width/2+60,r.y+r.height/2);await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(10);
 await page.locator('#throttle').fill('40');await expect(page.locator('#gear')).toContainText('40%');await page.locator('#neutral').click();await expect(page.locator('#gear')).toContainText('LUZ');
 await page.locator('#limits').click();await expect(page.locator('#info')).toBeVisible();await expect(page.locator('#info')).toContainText('umowne progi dydaktyczne');await page.keyboard.press('Escape');await expect(page.locator('#info')).not.toBeVisible();
});
test('mobile layout fits viewport and renders map',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('#lake')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('#help').click();await expect(page.locator('#info')).toBeVisible();await page.locator('#close-dialog').click();await page.screenshot({path:'/tmp/boat-mobile.png',fullPage:true});
});
