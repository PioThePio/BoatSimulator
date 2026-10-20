import {test,expect} from '@playwright/test';
test('keyboard, persistent steering, neutral and pause work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await expect(page.locator('#key-state-0')).toContainText('Pracuje');
 await expect(page.locator('.map-toolbar')).toContainText('600 × 400');await expect(page.locator('body')).not.toContainText('Spokojnie. Masz czas');
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');
 const angle=await page.locator('#wheel').getAttribute('aria-valuenow');expect(+angle).toBeGreaterThan(5);await page.waitForTimeout(250);await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow',angle);
 await page.keyboard.press('c');await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow','0');
 await page.keyboard.down('w');await page.waitForTimeout(1000);await page.keyboard.up('w');await expect(page.locator('#gear')).toContainText('NAPRZÓD');
 await page.waitForTimeout(1000);expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(.2);
 await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(.1);
 await page.keyboard.press('p');await expect(page.locator('#paused-label')).toBeVisible();const speed=await page.locator('#speed').innerText();await page.waitForTimeout(300);await expect(page.locator('#speed')).toHaveText(speed);
 await page.screenshot({path:'/tmp/boat-desktop.png',fullPage:false});expect(errors).toEqual([]);
});
test('mouse controls, environment and mooring are usable',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('[data-start="berth"]').click();
 await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('m');
 await page.waitForTimeout(150);const ropeLength=async()=>+(await page.locator('#rope-bow').innerText()).match(/([\d.]+) m/)[1];const before=await ropeLength();await page.locator('[data-action="shorten"][data-rope="bow"]').click();expect(await ropeLength()).toBeGreaterThan(before-.1);await page.waitForTimeout(1100);expect(await ropeLength()).toBeLessThan(before);
 await page.locator('[data-action="detach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toHaveText('niepołączona');
 await page.locator('#fenders').uncheck();await expect(page.locator('#fenders')).not.toBeChecked();
 await page.locator('#preset').selectOption('crosswind');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');await page.locator('#preset').selectOption('gusty');await expect(page.locator('#wind-value')).toHaveText('8.0 m/s');await expect(page.locator('#gusts')).toBeChecked();
 await page.locator('#wheel').scrollIntoViewIfNeeded();const r=await page.locator('#wheel').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2,radius=r.width*.4;await page.mouse.move(cx,cy-radius);await page.mouse.down();for(let i=1;i<=12;i++){const a=-Math.PI/2+i*Math.PI/24;await page.mouse.move(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);}await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(3);
 await page.locator('#throttle').fill('40');await expect(page.locator('#gear')).toContainText('40%');await page.locator('#neutral').click();await expect(page.locator('#gear')).toContainText('LUZ');
 await page.locator('#limits').click();await expect(page.locator('#info')).toBeVisible();await expect(page.locator('#info')).toContainText('umowne progi dydaktyczne');await page.keyboard.press('Escape');await expect(page.locator('#info')).not.toBeVisible();
});
test('mobile layout fits viewport and renders map',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#begin-session').click();await expect(page.locator('#lake')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('#help').click();await expect(page.locator('#info')).toBeVisible();await page.locator('#close-dialog').click();await page.screenshot({path:'/tmp/boat-mobile.png',fullPage:false});
});
test('custom vessel, independent twin throttles, linking and keyboard selection',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();
 await page.locator('#craft').selectOption('cabin');await expect(page.locator('#boat-length')).toHaveValue('7.5');await expect(page.locator('#boat-beam')).toHaveValue('2.65');
 await page.locator('#engine-count').selectOption('2');await page.locator('#power-left').fill('115');await page.locator('#power-right').fill('90');await page.locator('#apply-craft').click();
 await expect(page.locator('#second-engine')).toBeVisible();await expect(page.locator('.bottom-note')).toContainText('115 + 90 KM');
 await page.locator('#link-engines').uncheck();await page.locator('#throttle').fill('55');await page.locator('#throttle2').fill('-55');
 await expect(page.locator('#gear')).toContainText('NAPRZÓD');await expect(page.locator('#gear2')).toContainText('WSTECZ');
 await page.waitForTimeout(1900);await expect(page.locator('#engine-state')).toContainText('L:');await expect(page.locator('#engine-state')).toContainText('P:');
 await page.locator('#link-engines').check();await expect(page.locator('#throttle2')).toHaveValue('55');
 await page.locator('.wheel-section>.section-heading h2').click();await page.keyboard.press('Space');await expect(page.locator('#gear')).toContainText('LUZ');await expect(page.locator('#gear2')).toContainText('LUZ');
 await page.keyboard.press('t');await page.keyboard.press('2');await page.keyboard.down('w');await page.waitForTimeout(300);await page.keyboard.up('w');
 await expect(page.locator('#throttle')).toHaveValue('0');expect(+(await page.locator('#throttle2').inputValue())).toBeGreaterThan(0);expect(errors).toEqual([]);
});
test('select bollard explicitly, sonar updates, anchor windlass starts and stops',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await page.locator('[data-start="berth"]').click();
 await page.locator('#bollard-bow').selectOption('4');await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('P5');
 const near=+(await page.locator('#depth').innerText()).replace('m','').trim();await page.locator('[data-start="open"]').click();
 const deep=+(await page.locator('#depth').innerText()).replace('m','').trim();expect(deep).toBeGreaterThan(near+.5);
 await page.locator('#auto-waves').uncheck();await page.locator('#waves').fill('0.3');await expect(page.locator('#wave-value')).toHaveText('0.30 m');
 await page.locator('#anchor-target').fill('15');await page.locator('#anchor-lower').click();await page.waitForTimeout(1000);expect(parseFloat(await page.locator('#anchor-length').innerText())).toBeGreaterThan(.3);
 await page.locator('#anchor-hold').click();await page.waitForTimeout(150);const length=await page.locator('#anchor-length').innerText();await page.waitForTimeout(250);await expect(page.locator('#anchor-length')).toHaveText(length);
 await expect(page.locator('#anchor-profile')).toBeVisible();expect(errors).toEqual([]);
});
test('full-width lake and compact helm, circular rim grab, vertical lever and creep notch',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();const lake=await page.locator('#lake').boundingBox(),vw=page.viewportSize().width;expect(lake.width).toBeGreaterThan(vw*.95);
 const sonar=await page.locator('.sonar').boundingBox();expect(sonar.x).toBeGreaterThanOrEqual(lake.x);expect(sonar.y+sonar.height).toBeLessThanOrEqual(lake.y+lake.height);await expect(page.locator('.water-wrap>.telemetry')).toBeVisible();
 await page.locator('#wheel').scrollIntoViewIfNeeded();const wheel=await page.locator('#wheel').boundingBox(),cx=wheel.x+wheel.width/2,cy=wheel.y+wheel.height/2,r=wheel.width*.4;
 await page.mouse.move(cx,cy);await page.mouse.down();await page.mouse.move(cx+30,cy);await page.mouse.up();await expect(page.locator('#wheel')).toHaveAttribute('aria-valuenow','0');
 await page.mouse.move(cx,cy-r);await page.mouse.down();for(let i=1;i<=12;i++){const a=-Math.PI/2+i*Math.PI/24;await page.mouse.move(cx+Math.cos(a)*r,cy+Math.sin(a)*r);}await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(3);
 await page.keyboard.press('ArrowUp');await expect(page.locator('#throttle')).toHaveValue('8');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');await page.waitForTimeout(200);await expect(page.locator('#throttle')).toHaveValue('8');
 await page.keyboard.press('ArrowDown');await expect(page.locator('#throttle')).toHaveValue('0');await page.keyboard.press('ArrowDown');await expect(page.locator('#throttle')).toHaveValue('-8');await page.keyboard.press('Space');await expect(page.locator('#throttle')).toHaveValue('0');
 await page.keyboard.down('ArrowUp');await page.waitForTimeout(400);await page.keyboard.press('Space');await page.waitForTimeout(250);await expect(page.locator('#throttle')).toHaveValue('0');await page.keyboard.up('ArrowUp');
 const lever=await page.locator('#throttle').boundingBox();expect(lever.height).toBeGreaterThan(lever.width*2);await page.mouse.click(lever.x+lever.width/2,lever.y+15);expect(+(await page.locator('#throttle').inputValue())).toBeGreaterThan(50);await page.keyboard.press('Space');await expect(page.locator('#throttle')).toHaveValue('0');
});
test('shore tree mooring, drive raising and world overview work',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await page.locator('#craft').selectOption('tender');await page.locator('#apply-craft').click();await expect(page.locator('.bottom-note')).toContainText('4.2 × 1.75');await page.locator('[data-start="beach"]').click();await page.locator('#raise-engines').check();await page.locator('#bollard-bow').selectOption('7');await page.locator('[data-rope="bow"][data-action="attach"]').click();await expect(page.locator('#rope-bow')).toContainText('D1');await expect(page.locator('#raise-engines')).toBeChecked();await expect(page.locator('#propeller-health')).toContainText('100%');
 await page.locator('#craft').selectOption('cruiser');await page.locator('#apply-craft').click();await expect(page.locator('#condition-tag')).toHaveText('NA MIELIŹNIE');expect(parseFloat(await page.locator('#depth').innerText())).toBeLessThan(.5);
 await page.locator('#overview').click();await expect(page.locator('#minimap')).toBeVisible();await page.locator('[data-start="island"]').click();await expect(page.locator('#scene-label')).toHaveCount(0);expect(errors).toEqual([]);
});
test('mobile throttle steps, ignition, trim instruments and fuel station',async({page})=>{
 await page.setViewportSize({width:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();
 await expect(page.locator('#key-state-0')).toContainText('Wyłączony');await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await expect(page.locator('#key-state-0')).toContainText('Pracuje');
 await page.locator('[data-gas="1"]').click();await expect(page.locator('#throttle')).toHaveValue('8');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');await page.locator('[data-gas="0"]').click();await expect(page.locator('#throttle')).toHaveValue('0');await page.locator('[data-gas="-1"]').click();await expect(page.locator('#throttle')).toHaveValue('-8');await page.locator('[data-gas="0"]').click();
 await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('33%');await expect(page.locator('#gauge-volt strong')).not.toHaveText('0');await expect(page.locator('#bow-pitch')).toBeVisible();
 await page.locator('[data-start=fuel]').click();await page.locator('#refuel').click();await expect(page.locator('#fuel-status')).toContainText('TANKOWANIE');const before=parseFloat(await page.locator('#fuel-status').innerText());await expect.poll(async()=>parseFloat(await page.locator('#fuel-status').innerText())).toBeGreaterThan(before+.2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
});
test('two-click map mooring, trail and traffic switches, PWC and thruster equipment',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await page.locator('[data-start=berth]').click();
 const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});await expect(page.locator('#mooring-picker')).toBeVisible();await page.locator('[data-cleat=starboardBow]').click();await expect(page.locator('#rope-starboardBow')).toContainText('m');await expect(page.locator('#map-rope-starboardBow')).toContainText('m');await page.locator('#close-mooring').click();
 await page.locator('#trail-toggle').click();await expect(page.locator('#trail-toggle')).toHaveAttribute('aria-pressed','false');await page.locator('#traffic').uncheck();await expect(page.locator('#traffic')).not.toBeChecked();
 await page.locator('#bow-thruster').check();await page.locator('#stern-thruster').check();await page.locator('#apply-craft').click();await expect(page.locator('#thruster-bow')).toBeVisible();await expect(page.locator('#thruster-stern')).toBeVisible();
 await page.locator('#craft').selectOption('pwc');await page.locator('#power-left').fill('350');await page.locator('#apply-craft').click();await expect(page.locator('#engine-count')).toBeDisabled();await expect(page.locator('.bottom-note')).toContainText('350 KM');await expect(page.locator('#thruster-panel')).not.toBeVisible();await expect(page.locator('#second-engine')).not.toBeVisible();await expect(page.locator('[data-trim="1"]')).toBeDisabled();expect(errors).toEqual([]);
});
test('startup menu configures vessel and weather, centered boat exposes map anchor and sonar switch',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('#setup-dialog')).toBeVisible();await page.locator('#craft').selectOption('cabin');await page.locator('#preset').selectOption('crosswind');await page.locator('#bow-thruster').check();await page.locator('#begin-session').click();await expect(page.locator('#setup-dialog')).not.toBeVisible();await expect(page.locator('#craft-state')).toContainText('7.5 × 2.65');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');
 await page.locator('#preset').selectOption('calm');await page.locator('#lake').scrollIntoViewIfNeeded();const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+7.5*.39*scale,y:lake.height/2}});await expect(page.locator('#anchor-picker')).toBeVisible();await page.locator('#map-anchor-target').fill('4');await page.locator('#anchor-picker [data-anchor=lower]').click();await expect.poll(async()=>parseFloat(await page.locator('#anchor-length').innerText())).toBeGreaterThan(.2);await page.locator('#anchor-picker [data-anchor=hold]').click();await expect(page.locator('#anchor-target')).toHaveValue('4');
 await page.locator('#sonar-toggle').uncheck();await expect(page.locator('.sonar')).not.toBeVisible();await page.locator('#sonar-toggle').check();await expect(page.locator('.sonar')).toBeVisible();await expect(page.locator('.wheel-section #thruster-panel')).toBeVisible();await expect(page.locator('#gauge-fuel small')).toContainText('L/h');await expect(page.locator('#gauge-temp strong')).toHaveText('18');expect(errors).toEqual([]);
});
test('compact twin bank shares trim and step buttons, wheel interior accepts a circular grab',async({page})=>{
 await page.setViewportSize({width:390,height:950});await page.goto('/');await page.locator('#engine-count').selectOption('2');await page.locator('#begin-session').click();
 const left=await page.locator('#throttle').boundingBox(),right=await page.locator('#throttle2').boundingBox();expect(Math.abs(left.y-right.y)).toBeLessThan(2);expect(right.x).toBeGreaterThan(left.x);await expect(page.locator('[data-gas="1"]')).toHaveCount(1);await expect(page.locator('[data-trim="1"]')).toHaveCount(1);
 await page.locator('[data-gas="1"]').click();await expect(page.locator('#throttle')).toHaveValue('8');await expect(page.locator('#throttle2')).toHaveValue('8');await page.locator('[data-gas="0"]').click();await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('33%');
 await page.locator('#wheel').scrollIntoViewIfNeeded();const r=await page.locator('#wheel').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2,rad=r.width*.23;await page.mouse.move(cx+rad,cy);await page.mouse.down();for(let i=1;i<=12;i++){const a=i*Math.PI/24;await page.mouse.move(cx+rad*Math.cos(a),cy+rad*Math.sin(a));}await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('map bollard allows hauling, loosening and detaching the existing rope',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('[data-start=berth]').click();const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});await page.locator('[data-cleat=starboardBow]').click();await expect(page.locator('#map-rope-starboardBow')).toContainText('m');
 const len=async()=>+(await page.locator('#map-rope-starboardBow').innerText()).match(/([\d.]+) m/)[1],before=await len();await page.locator('#map-ropes [data-action=shorten]').click();await expect.poll(len).toBeLessThan(before);await page.locator('#map-ropes [data-action=loosen]').click();const shorter=await len();await expect.poll(len).toBeGreaterThan(shorter);await page.locator('#map-ropes [data-action=detach]').click();await expect(page.locator('#rope-starboardBow')).toHaveText('niepołączona');await expect(page.locator('[data-cleat=starboardBow]')).toBeEnabled();
});
test('real lake run keeps a gentle heading with slight steering during 350 HP acceleration',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#power-left').fill('350');await page.locator('#begin-session').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.clock.runFor(1500);await expect(page.locator('#key-state-0')).toHaveText('Pracuje');
 await page.locator('#throttle').fill('80');await page.locator('.wheel-section>.section-heading h2').click();await page.keyboard.down('ArrowRight');await page.clock.runFor(120);await page.keyboard.up('ArrowRight');await page.clock.runFor(15000);
 expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(4);const heading=parseFloat(await page.locator('#heading').innerText());expect(heading).toBeGreaterThan(90);expect(heading).toBeLessThan(120);expect(Math.abs(parseFloat(await page.locator('#yaw').innerText()))).toBeLessThan(3);await expect(page.locator('#condition-tag')).toHaveText('BEZ USZKODZEŃ');
});
test('bow anchor hit area follows the largest hull at high zoom',async({page})=>{
 await page.goto('/');await page.locator('#craft').selectOption('cruiser');await page.locator('#boat-length').fill('11');await page.locator('#begin-session').click();for(let i=0;i<5;i++)await page.locator('#zoom-in').click();await page.locator('#lake').scrollIntoViewIfNeeded();const r=await page.locator('#lake').boundingBox(),scale=Math.min(r.width/140,r.height/80)*3;await page.locator('#lake').click({position:{x:r.width/2+11*.49*scale,y:r.height/2}});await expect(page.locator('#anchor-picker')).toBeVisible();
});
