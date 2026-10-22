import {test,expect} from '@playwright/test';
async function setup(page){if(!await page.locator('#setup-dialog').isVisible())await page.locator('#setup-open').click();}
async function chooseStart(page,id){await setup(page);await page.locator('#start-location').selectOption(id==='open'?'lake':id);await page.locator('#begin-session').click();}
async function weather(page){if(!await page.locator('#environment-panel').isVisible())await page.locator('#weather-open').click();}

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
 await page.goto('/');await page.locator('#begin-session').click();await chooseStart(page,'berth');
 await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('m');
 await page.waitForTimeout(150);const ropeLength=async()=>+(await page.locator('#rope-bow').innerText()).match(/([\d.]+) m/)[1];const before=await ropeLength();const haul=await page.locator('[data-action="shorten"][data-rope="bow"]').boundingBox();await page.mouse.move(haul.x+12,haul.y+12);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();expect(await ropeLength()).toBeLessThan(before);
 await page.locator('[data-action="detach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toHaveText('niepołączona');
 await page.locator('#fenders').uncheck();await expect(page.locator('#fenders')).not.toBeChecked();
 await weather(page);await page.locator('#preset').selectOption('crosswind');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');await weather(page);await page.locator('#preset').selectOption('gusty');await expect(page.locator('#wind-value')).toHaveText('5.0–11.0 m/s');await expect(page.locator('#wind-min')).toHaveValue('5');await expect(page.locator('#wind-dir-variation')).toHaveValue('30');
 await page.locator('#wheel').scrollIntoViewIfNeeded();const r=await page.locator('#wheel').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2,radius=r.width*.4;await page.mouse.move(cx,cy-radius);await page.mouse.down();for(let i=1;i<=12;i++){const a=-Math.PI/2+i*Math.PI/24;await page.mouse.move(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);}await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(3);
 await page.locator('#throttle').fill('40');await expect(page.locator('#gear')).toContainText('40%');await page.locator('#neutral').click();await expect(page.locator('#gear')).toContainText('LUZ');
 await page.locator('#help').click();await expect(page.locator('#info')).toBeVisible();await expect(page.locator('#info')).toContainText('umowne progi dydaktyczne');await page.keyboard.press('Escape');await expect(page.locator('#info')).not.toBeVisible();
});
test('mobile layout fits viewport and renders map',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#begin-session').click();await expect(page.locator('#lake')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.locator('#help').click();await expect(page.locator('#info')).toBeVisible();await page.locator('#close-dialog').click();await page.screenshot({path:'/tmp/boat-mobile.png',fullPage:false});
});
test('custom vessel, independent twin throttles, linking and keyboard selection',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();
 await setup(page);await page.locator('#craft').selectOption('cabin');await expect(page.locator('#boat-length')).toHaveValue('7.5');await expect(page.locator('#boat-beam')).toHaveValue('2.65');
 await page.locator('#engine-count').selectOption('2');await page.locator('#power-left').fill('115');await page.locator('#power-right').fill('90');await page.locator('#begin-session').click();
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
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await chooseStart(page,'berth');
 await page.locator('#bollard-bow').selectOption('4');await page.locator('[data-action="attach"][data-rope="bow"]').click();await expect(page.locator('#rope-bow')).toContainText('P5');
 const near=+(await page.locator('#depth').innerText()).replace('m','').trim();await chooseStart(page,'open');
 const deep=+(await page.locator('#depth').innerText()).replace('m','').trim();expect(deep).toBeGreaterThan(near+.5);
 await weather(page);await page.locator('#auto-waves').uncheck();await page.locator('#waves').fill('0.3');await expect(page.locator('#wave-value')).toHaveText('0.30 m');
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
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await setup(page);await page.locator('#craft').selectOption('tender');await page.locator('#begin-session').click();await expect(page.locator('.bottom-note')).toContainText('4.2 × 1.75');await chooseStart(page,'beach');for(let i=0;i<12;i++)await page.locator('[data-trim="1"]').click();await page.locator('#bollard-bow').selectOption('7');await page.locator('[data-rope="bow"][data-action="attach"]').click();await expect(page.locator('#rope-bow')).toContainText('D1');await expect(page.locator('#trim-value')).toHaveText('100%');await expect(page.locator('#raise-engines')).toHaveCount(0);await expect(page.locator('#propeller-health')).toContainText('100%');
 await setup(page);await page.locator('#craft').selectOption('cruiser');await page.locator('#begin-session').click();await expect(page.locator('#condition-tag')).toHaveText('NA MIELIŹNIE');expect(parseFloat(await page.locator('#depth').innerText())).toBeLessThan(.5);
 await page.locator('#overview').click();await expect(page.locator('#minimap')).toBeVisible();await chooseStart(page,'island');await expect(page.locator('#scene-label')).toHaveCount(0);expect(errors).toEqual([]);
});
test('mobile throttle steps, ignition, trim instruments and fuel station',async({page})=>{
 await page.setViewportSize({width:390,height:844});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();
 await expect(page.locator('#key-state-0')).toContainText('Wyłączony');await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await page.locator('#ignition-0 [data-key-turn=\"1\"]').click();await expect(page.locator('#key-state-0')).toContainText('Pracuje');
 await page.locator('[data-gas="1"]').click();await expect(page.locator('#throttle')).toHaveValue('8');await expect(page.locator('#gear')).toContainText('PEŁZAJĄCY');await page.locator('[data-gas="0"]').click();await expect(page.locator('#throttle')).toHaveValue('0');await page.locator('[data-gas="-1"]').click();await expect(page.locator('#throttle')).toHaveValue('-8');await page.locator('[data-gas="0"]').click();
 await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('15%');await expect(page.locator('#gauge-volt strong')).not.toHaveText('0');await expect(page.locator('#bow-pitch')).toBeVisible();
 await chooseStart(page,'fuel');await page.locator('[data-action="attach"][data-rope="bow"]').click();await page.locator('#refuel').click();await expect(page.locator('#fuel-status')).toContainText('TANKOWANIE');const before=parseFloat(await page.locator('#fuel-status').innerText());await expect.poll(async()=>parseFloat(await page.locator('#fuel-status').innerText())).toBeGreaterThan(before+.2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
});
test('two-click map mooring, trail and traffic switches, PWC and thruster equipment',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await page.locator('#begin-session').click();await chooseStart(page,'berth');
 const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});await expect(page.locator('#mooring-picker')).toBeVisible();await page.locator('[data-cleat=starboardBow]').click();await expect(page.locator('#rope-starboardBow')).toContainText('m');await expect(page.locator('#map-rope-starboardBow')).toContainText('m');await page.locator('#close-mooring').click();
 await page.locator('#trail-toggle').click();await expect(page.locator('#trail-toggle')).toHaveAttribute('aria-pressed','false');await weather(page);await page.locator('#traffic').uncheck();await expect(page.locator('#traffic')).not.toBeChecked();
 await setup(page);await page.locator('#bow-thruster').check();await page.locator('#stern-thruster').check();await page.locator('#begin-session').click();await expect(page.locator('#thruster-bow')).toBeVisible();await expect(page.locator('#thruster-stern')).toBeVisible();
 await setup(page);await page.locator('#craft').selectOption('pwc');await page.locator('#power-left').fill('350');await page.locator('#begin-session').click();await expect(page.locator('#engine-count')).toBeDisabled();await expect(page.locator('.bottom-note')).toContainText('350 KM');await expect(page.locator('#thruster-panel')).not.toBeVisible();await expect(page.locator('#second-engine')).not.toBeVisible();await expect(page.locator('[data-trim="1"]')).toBeDisabled();expect(errors).toEqual([]);
});
test('startup menu configures vessel and weather, centered boat exposes map anchor and sonar switch',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/');await expect(page.locator('#setup-dialog')).toBeVisible();await setup(page);await page.locator('#craft').selectOption('cabin');await weather(page);await page.locator('#preset').selectOption('crosswind');await setup(page);await page.locator('#bow-thruster').check();await page.locator('#begin-session').click();await expect(page.locator('#setup-dialog')).not.toBeVisible();await expect(page.locator('#craft-state')).toContainText('7.5 × 2.65');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');
 await weather(page);await page.locator('#preset').selectOption('calm');await page.locator('#lake').scrollIntoViewIfNeeded();const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+7.5*.39*scale,y:lake.height/2}});await expect(page.locator('#anchor-picker')).toBeVisible();await page.locator('#map-anchor-target').fill('4');await page.locator('#anchor-picker [data-anchor=lower]').click();await expect.poll(async()=>parseFloat(await page.locator('#anchor-length').innerText())).toBeGreaterThan(.2);await page.locator('#anchor-picker [data-anchor=hold]').click();await expect(page.locator('#anchor-target')).toHaveValue('4');
 await page.locator('#sonar-toggle').uncheck();await expect(page.locator('.sonar')).not.toBeVisible();await page.locator('#sonar-toggle').check();await expect(page.locator('.sonar')).toBeVisible();await expect(page.locator('.wheel-section #thruster-panel')).toBeVisible();await expect(page.locator('#gauge-fuel small')).toContainText('L/h');await expect(page.locator('#gauge-temp strong')).toHaveText('18');expect(errors).toEqual([]);
});
test('compact twin bank shares trim and step buttons, wheel interior accepts a circular grab',async({page})=>{
 await page.setViewportSize({width:390,height:950});await page.goto('/');await page.locator('#engine-count').selectOption('2');await page.locator('#begin-session').click();
 const left=await page.locator('#throttle').boundingBox(),right=await page.locator('#throttle2').boundingBox();expect(Math.abs(left.y-right.y)).toBeLessThan(2);expect(right.x).toBeGreaterThan(left.x);await expect(page.locator('[data-gas="1"]')).toHaveCount(1);await expect(page.locator('[data-trim="1"]')).toHaveCount(1);
 await page.locator('[data-gas="1"]').click();await expect(page.locator('#throttle')).toHaveValue('8');await expect(page.locator('#throttle2')).toHaveValue('8');await page.locator('[data-gas="0"]').click();await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('15%');
 await page.locator('#wheel').scrollIntoViewIfNeeded();const r=await page.locator('#wheel').boundingBox(),cx=r.x+r.width/2,cy=r.y+r.height/2,rad=r.width*.23;await page.mouse.move(cx+rad,cy);await page.mouse.down();for(let i=1;i<=12;i++){const a=i*Math.PI/24;await page.mouse.move(cx+rad*Math.cos(a),cy+rad*Math.sin(a));}await page.mouse.up();expect(+(await page.locator('#wheel').getAttribute('aria-valuenow'))).toBeGreaterThan(5);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('map bollard allows hauling, loosening and detaching the existing rope',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await chooseStart(page,'berth');const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').click({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});await page.locator('[data-cleat=starboardBow]').click();await expect(page.locator('#map-rope-starboardBow')).toContainText('m');
 const len=async()=>+(await page.locator('#map-rope-starboardBow').innerText()).match(/([\d.]+) m/)[1];
 async function hold(action){const btn=page.locator('#map-ropes [data-action='+action+']');const r=await btn.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.down();await page.waitForTimeout(650);await page.mouse.up();await page.waitForTimeout(120);}
 const before=await len();await hold('shorten');const shorter=await len();expect(shorter).toBeLessThan(before);await page.waitForTimeout(300);expect(await len()).toBe(shorter);await hold('loosen');expect(await len()).toBeGreaterThan(shorter);await page.locator('#map-ropes [data-action=detach]').click();await expect(page.locator('#rope-starboardBow')).toHaveText('niepołączona');await expect(page.locator('[data-cleat=starboardBow]')).toBeEnabled();
});
test('real lake run keeps a gentle heading with slight steering during 350 HP acceleration',async({page})=>{
 // Keep the physical steering command fixed while the live keyboard rate is configurable.
 await page.addInitScript(()=>localStorage.setItem('przystan-steering',JSON.stringify({boat:1,suv:1})));
 await page.clock.install();await page.goto('/');await page.locator('#power-left').fill('350');await page.locator('#begin-session').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.clock.runFor(1500);await expect(page.locator('#key-state-0')).toHaveText('Pracuje');
 await page.locator('#throttle').fill('80');await page.locator('.wheel-section>.section-heading h2').click();await page.keyboard.down('ArrowRight');await page.clock.runFor(90);await page.keyboard.up('ArrowRight');await page.clock.runFor(15000);
 expect(parseFloat(await page.locator('#speed').innerText())).toBeGreaterThan(4);const heading=parseFloat(await page.locator('#heading').innerText());expect(heading).toBeGreaterThan(90);expect(heading).toBeLessThan(120);expect(Math.abs(parseFloat(await page.locator('#yaw').innerText()))).toBeLessThan(3);await expect(page.locator('#condition-tag')).toHaveText('BEZ USZKODZEŃ');
});
test('bow anchor hit area follows the largest hull at high zoom',async({page})=>{
 await page.goto('/');await setup(page);await page.locator('#craft').selectOption('cruiser');await page.locator('#boat-length').fill('11');await page.locator('#begin-session').click();for(let i=0;i<5;i++)await page.locator('#zoom-in').click();await page.locator('#lake').scrollIntoViewIfNeeded();const r=await page.locator('#lake').boundingBox(),scale=Math.min(r.width/140,r.height/80)*3;await page.locator('#lake').click({position:{x:r.width/2+11*.49*scale,y:r.height/2}});await expect(page.locator('#anchor-picker')).toBeVisible();
});
test('twins show separate changing tachometers and a single left turn switches I to 0',async({page})=>{
 await page.goto('/');await page.locator('#engine-count').selectOption('2');await page.locator('#begin-session').click();
 await expect(page.locator('#gauge-rpm')).toBeVisible();await expect(page.locator('#gauge-rpm2')).toBeVisible();
 await page.locator('#ignition-0 [data-key-turn="1"]').click();await page.locator('#ignition-0 [data-key-turn="1"]').click();await expect(page.locator('#key-state-0')).toHaveText('Pracuje');
 await expect.poll(async()=>+(await page.locator('#gauge-rpm strong').innerText())).toBeGreaterThan(700);await expect(page.locator('#gauge-rpm2 strong')).toHaveText('0');
 const rpm=await page.locator('#gauge-rpm strong').innerText();await expect.poll(async()=>page.locator('#gauge-rpm strong').innerText()).not.toBe(rpm);
 await page.locator('#link-engines').uncheck();await page.locator('#throttle').fill('8');await expect.poll(async()=>+(await page.locator('#gauge-rpm strong').innerText())).toBeGreaterThan(790);
 await page.locator('#ignition-0 [data-key-turn="-1"]').click();await expect(page.locator('#key-state-0')).toHaveText('Wyłączony');await expect(page.locator('#gauge-rpm strong')).toHaveText('0');
 await expect(page.locator('#key-0 .key-pointer')).toHaveAttribute('style',/rotate\(-48deg\)/);
 await setup(page);await page.locator('#craft').selectOption('tender');await page.locator('#engine-count').selectOption('1');await page.locator('#begin-session').click();await expect(page.locator('#gauge-rpm2')).not.toBeVisible();
});
test('mooring boat diagram drags, retains its position on another bollard and operates ropes',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await chooseStart(page,'berth');await page.locator('#lake').scrollIntoViewIfNeeded();
 const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);
 const select=async(x,y)=>page.locator('#lake').click({position:{x:lake.width/2+(x-24.3)*scale,y:lake.height/2+(y-22)*scale}});
 await select(29,17);await expect(page.locator('.mooring-hull')).toBeVisible();await expect(page.locator('#map-ropes [data-cleat]')).toHaveCount(5);
 await page.locator('[data-cleat=starboardBow]').click();await expect(page.locator('#map-rope-starboardBow')).toContainText('P5');
 const before=await page.locator('#mooring-picker').boundingBox(),handle=await page.locator('#mooring-handle').boundingBox();
 await page.mouse.move(handle.x+30,handle.y+15);await page.mouse.down();await page.mouse.move(handle.x+30+230,handle.y+15-90,{steps:8});await page.mouse.up();
 const after=await page.locator('#mooring-picker').boundingBox();expect(after.x-before.x).toBeGreaterThan(200);expect(after.y).toBeLessThan(before.y-60);
 await select(12,12.8);await expect(page.locator('#mooring-target')).toHaveText('Poler 1');const switched=await page.locator('#mooring-picker').boundingBox();expect(Math.abs(switched.x-after.x)).toBeLessThan(2);expect(Math.abs(switched.y-after.y)).toBeLessThan(2);
 await expect(page.locator('#map-rope-starboardBow')).toContainText('P5');await page.locator('#map-ropes [data-action=detach]').click();await expect(page.locator('[data-cleat=starboardBow]')).toBeEnabled();
 await page.setViewportSize({width:390,height:844});const compact=await page.locator('#mooring-picker').boundingBox(),smallLake=await page.locator('#lake').boundingBox();expect(compact.x).toBeGreaterThanOrEqual(smallLake.x-1);expect(compact.x+compact.width).toBeLessThanOrEqual(smallLake.x+smallLake.width+1);
});
test('mooring header can be dragged by touch within the mobile map',async({browser})=>{
 const context=await browser.newContext({viewport:{width:390,height:950},isMobile:true,hasTouch:true});
 try{
  const page=await context.newPage();await page.goto('http://127.0.0.1:5173');await page.locator('#begin-session').tap();await chooseStart(page,'berth');await page.locator('#lake').scrollIntoViewIfNeeded();
  const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);await page.locator('#lake').tap({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});
  await expect(page.locator('#mooring-picker')).toBeVisible();const before=await page.locator('#mooring-picker').boundingBox(),handle=await page.locator('#mooring-handle').boundingBox(),x=handle.x+25,y=handle.y+15;
  const session=await context.newCDPSession(page);await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+10,y:y-30}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  const after=await page.locator('#mooring-picker').boundingBox();expect(after.y).toBeLessThan(before.y-20);expect(after.y).toBeGreaterThanOrEqual(lake.y-1);await expect(page.locator('#mooring-picker')).toBeVisible();
 }finally{await context.close();}
});
test('restart opens the setup menu with the selected vessel, weather and location retained',async({page})=>{
 await page.goto('/');await page.locator('#craft').selectOption('cabin');await page.locator('#power-left').fill('150');await page.locator('#start-location').selectOption('canal');await page.locator('#preset').selectOption('crosswind');await page.locator('#begin-session').click();
 await expect(page.locator('#craft-state')).toContainText('150 KM');await expect(page.locator('#wind-value')).toHaveText('6.0 m/s');await expect(page.locator('#vessel-panel')).not.toBeVisible();await expect(page.locator('#environment-panel')).not.toBeVisible();await expect(page.locator('#settings #vessel-panel')).toHaveCount(0);await expect(page.locator('#settings #environment-panel')).toHaveCount(0);
 const condition=await page.locator('.condition-compact').boundingBox(),attitude=await page.locator('.attitude-svg').boundingBox();expect(condition.y).toBeGreaterThan(attitude.y+attitude.height);await expect(page.locator('.pitch-gauge .condition-compact')).toBeVisible();await expect(page.locator('#limits')).toHaveCount(0);
 await page.locator('.wheel-section h2').click();await page.keyboard.press('r');await expect(page.locator('#setup-dialog')).toBeVisible();await expect(page.locator('#craft')).toHaveValue('cabin');await expect(page.locator('#power-left')).toHaveValue('150');await expect(page.locator('#start-location')).toHaveValue('canal');await expect(page.locator('#preset')).toHaveValue('crosswind');
 await page.locator('#start-location').selectOption('fuel');await page.locator('#begin-session').click();await page.locator('#reset').click();await expect(page.locator('#setup-dialog')).toBeVisible();await expect(page.locator('#start-location')).toHaveValue('fuel');await page.locator('#setup-close').click();await expect(page.locator('#setup-dialog')).not.toBeVisible();
});
test('weather is a map window and its settings persist after closing and reopening',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('#weather-open').click();await expect(page.locator('#weather-picker')).toBeVisible();await expect(page.locator('#weather-content #environment-panel')).toBeVisible();
 await page.locator('#wind').fill('7');await expect(page.locator('#wind-value')).toHaveText('0.0–7.0 m/s');await page.locator('#close-weather').click();await expect(page.locator('#environment-panel')).not.toBeVisible();await page.locator('#weather-open').click();await expect(page.locator('#wind')).toHaveValue('7');
 await page.locator('#close-weather').click();await page.locator('#setup-open').click();await expect(page.locator('#setup-weather #environment-panel')).toBeVisible();await expect(page.locator('#wind')).toHaveValue('7');
});
test('anchor window drags and applies a condition-dependent scope suggestion to both controls',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('#show-anchor').click();await expect(page.locator('#map-anchor-advice')).toContainText('5:1');
 const suggested=+(await page.locator('#map-anchor-advice').innerText()).match(/· (\d+) m rode/)[1];await page.locator('#map-anchor-suggest').click();await expect(page.locator('#anchor-target')).toHaveValue(String(suggested));await expect(page.locator('#map-anchor-target')).toHaveValue(String(suggested));
 const before=await page.locator('#anchor-picker').boundingBox(),handle=await page.locator('#anchor-handle').boundingBox();await page.mouse.move(handle.x+30,handle.y+15);await page.mouse.down();await page.mouse.move(handle.x-100,handle.y-45,{steps:8});await page.mouse.up();const after=await page.locator('#anchor-picker').boundingBox();expect(after.x).toBeLessThan(before.x-100);expect(after.y).toBeLessThan(before.y-40);
 await page.locator('#close-anchor').click();await weather(page);await page.locator('#wind').fill('9');await page.locator('[data-steady=wind]').click();await page.locator('#close-weather').click();await page.locator('#show-anchor').click();await expect(page.locator('#map-anchor-advice')).toContainText('7:1');await page.locator('#map-anchor-suggest').click();const stronger=+(await page.locator('#map-anchor-target').inputValue());expect(stronger).toBeGreaterThan(suggested);
});
test('trim detents, propeller-ground diagram and actual steering position are visible',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('beach');await page.locator('#begin-session').click();await expect(page.locator('#prop-water-state')).toContainText('ŚRUBA DOTYKA DNA');await expect(page.locator('#attitude-bottom')).not.toHaveAttribute('d','');
 for(let i=0;i<6;i++)await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('40%');await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('50%');for(let i=0;i<3;i++)await page.locator('[data-trim="1"]').click();await expect(page.locator('#trim-value')).toHaveText('80%');
 await expect(page.locator('#prop-water-state')).not.toContainText('ŚRUBA DOTYKA DNA',{timeout:9000});
 await page.locator('.wheel-section h2').click();await page.keyboard.down('ArrowRight');await page.waitForTimeout(450);await page.keyboard.up('ArrowRight');await expect(page.locator('#rudder-angle')).toContainText('P');
 const commanded=await page.locator('#rudder-command').getAttribute('style'),actual=await page.locator('#rudder-actual').getAttribute('style');expect(parseFloat(commanded.match(/left: ([\d.]+)/)[1])).toBeGreaterThan(50);expect(parseFloat(actual.match(/left: ([\d.]+)/)[1])).toBeGreaterThan(50);
});
test('contact diagram shows the real fender and damaged bow, then fades while keeping hull damage',async({page})=>{
 await page.goto('/');await page.locator('#begin-session').click();await page.locator('#pause').click();
 const states=await page.evaluate(async()=>{
  const {createBoat,step}=await import('/src/physics.js'),{updateContactInstrument}=await import('/src/contact-instrument.js');
  function hit(bow){const b=createBoat('berth');b.x=bow?22.7:20.9;b.y=22;b.a=bow?Math.PI:-Math.PI/2;b.vx=bow?-.5:-.2;for(let i=0;i<72;i++)step(b,{},1/120);return b;}
  const fender=hit(false);updateContactInstrument(fender);const f=document.querySelector(`[data-contact-fender="${fender.lastImpact.fender}"]`);
  const safe={color:f.getAttribute('fill'),flash:f.dataset.contact,damage:fender.damage};
  const bow=hit(true);updateContactInstrument(bow);const el=document.querySelector('[data-contact-zone="bow"]');
  const strike={color:el.getAttribute('stroke'),flash:el.dataset.contact,damage:el.dataset.damage,label:document.querySelector('#impact-info').textContent};
  bow.time+=2;updateContactInstrument(bow);return{safe,strike,faded:{color:el.getAttribute('stroke'),flash:el.dataset.contact,damage:el.dataset.damage}};
 });
 expect(states.safe).toEqual({color:'#66bd8a',flash:'true',damage:0});expect(states.strike.flash).toBe('true');expect(+states.strike.damage).toBeGreaterThan(0);expect(states.strike.label).toContain('Dziób');expect(states.faded.flash).toBe('false');expect(states.faded.color).toBe('#df9c54');expect(states.faded.damage).toBe(states.strike.damage);
});
test('phone keeps compact vessel condition below the attitude graphic with legible percentages',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.locator('#begin-session').click();
 await page.locator('.condition-compact').scrollIntoViewIfNeeded();await expect(page.locator('.contact-diagram')).toBeVisible();await expect(page.locator('#hull-value')).toHaveText('100%');
 const bounds=await page.locator('.condition-compact').boundingBox(),attitude=await page.locator('.attitude-svg').boundingBox();expect(bounds.y).toBeGreaterThan(attitude.y+attitude.height);expect(bounds.x+bounds.width).toBeLessThanOrEqual(390);
 expect(await page.locator('#hull-value').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(11);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v8-mobile-condition.png',fullPage:false});
});
