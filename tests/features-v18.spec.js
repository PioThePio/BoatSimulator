import {test,expect} from '@playwright/test';

test('phone keeps helm, propulsion and the immersion graphic in one row, with a minimal header and station selection below',async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:1000});await page.goto('/');await page.locator('#begin-session').click();
 const header=await page.locator('header').boundingBox(),wheel=await page.locator('.wheel-section').boundingBox(),power=await page.locator('.throttle-section').boundingBox(),attitude=await page.locator('.attitude-column').boundingBox(),station=await page.locator('.vehicle-selector').boundingBox();
 expect(header.height).toBeLessThanOrEqual(28);expect(Math.abs(wheel.y-power.y)).toBeLessThan(2);expect(Math.abs(power.y-attitude.y)).toBeLessThan(2);expect(attitude.x).toBeGreaterThan(power.x);expect(station.y).toBeGreaterThan(wheel.y+wheel.height);
 await expect(page.locator('#setup-open')).toHaveCount(0);await expect(page.locator('#switch-vehicle')).toHaveCount(0);await expect(page.locator('#open-settings')).toBeVisible();await expect(page.locator('.tow-console')).toBeHidden();await expect(page.locator('.slip-panel')).toBeHidden();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);await page.screenshot({path:'/tmp/boat-v18-phone-final.png',fullPage:true});expect(errors).toEqual([]);
});

test('navigation bar switches km/h and knots, wind and current switch independently to km/h and remember units',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#wind').fill('2.5');await page.locator('#wind-min').fill('2.5');await page.locator('#current').fill('0.5');await page.locator('#current-min').fill('0.5');await page.locator('#spatial-effects').uncheck();await page.locator('#begin-session').click();
 await expect(page.locator('#speed small')).toHaveText('km/h');await expect(page.locator('#water-speed small')).toHaveText('km/h');await expect(page.locator('#gauge-speed small')).toHaveText('km/h');await expect(page.locator('#shore-distance')).toHaveText(/\d+ m/);
 await page.locator('.telemetry').click();await expect(page.locator('#speed small')).toHaveText('kn');await expect(page.locator('#water-speed small')).toHaveText('kn');await expect(page.locator('#gauge-speed small')).toHaveText('km/h');
 await page.locator('[data-flow-unit=wind]').click();await expect(page.locator('#wind-speed')).toHaveText('9.0 km/h');await expect(page.locator('#current-speed')).toHaveText('0.50 m/s');await page.locator('[data-flow-unit=current]').click();await expect(page.locator('#current-speed')).toHaveText('1.8 km/h');
 await page.reload();await page.locator('#begin-session').click();await expect(page.locator('#speed small')).toHaveText('kn');await expect(page.locator('#wind-speed')).toContainText('km/h');await expect(page.locator('#current-speed')).toContainText('km/h');
});

test('centre of the compact ignition reliably starts an engine and its left side switches fully off on touch-sized screens',async({page})=>{
 await page.setViewportSize({width:390,height:1000});await page.clock.install();await page.goto('/');await page.locator('#begin-session').click();await page.locator('#key-0').click();await page.locator('#key-0').click();await page.clock.runFor(1400);await expect(page.locator('#key-state-0')).toHaveText('Pracuje');const rect=await page.locator('#key-0').boundingBox();await page.mouse.click(rect.x+rect.width*.2,rect.y+rect.height*.5);await expect(page.locator('#key-state-0')).toHaveText('Wyłączony');
});

test('water repair can be used at the separate pier after attaching a line and rejects an unmoored boat',async({page})=>{
 await page.goto('/');await page.locator('#start-location').selectOption('service');await page.locator('#begin-session').click();await page.locator('#repair').click();await expect(page.locator('#toast')).toContainText('Przycumuj');await page.locator('#bollard-bow').selectOption({label:'SER22 · Serwis przy slipie · 22'});await page.locator('#ropes [data-rope=bow][data-action=attach]').click();await page.locator('#repair').click();await expect(page.locator('#toast')).toContainText('nie wymagają naprawy');await expect(page.locator('#condition-tag')).not.toHaveText('NA MIELIŹNIE');
});

test('bollards have no permanent map identifiers; selection reveals only the selected identifier',async({page})=>{
 await page.addInitScript(()=>{const original=CanvasRenderingContext2D.prototype.fillText;window.mapWords=new Set();CanvasRenderingContext2D.prototype.fillText=function(text,...args){if(this.canvas.id==='lake')window.mapWords.add(String(text));return original.call(this,text,...args);};});
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();await page.clock.runFor(100);const before=await page.evaluate(async()=>{const{BOLLARDS}=await import('/src/world.js');return BOLLARDS.filter(q=>window.mapWords.has(q.id)).map(q=>q.id);});expect(before).toEqual([]);
 const map=await page.locator('#lake').boundingBox(),scale=Math.min(map.width/140,map.height/80);await page.locator('#lake').click({position:{x:map.width/2+(29-24.3)*scale,y:map.height/2+(17-22)*scale}});await expect(page.locator('#mooring-picker')).toBeVisible();await page.clock.runFor(100);const after=await page.evaluate(async()=>{const{BOLLARDS}=await import('/src/world.js');return BOLLARDS.filter(q=>window.mapWords.has(q.id)).map(q=>q.id);});expect(after.length).toBe(1);
});

test('mooring icon starts white for a slack line and becomes green when held hauling creates real tension',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();const map=await page.locator('#lake').boundingBox(),scale=Math.min(map.width/140,map.height/80);await page.locator('#lake').click({position:{x:map.width/2+(29-24.3)*scale,y:map.height/2+(17-22)*scale}});await page.locator('[data-cleat=bow]').click();await page.clock.runFor(100);await expect(page.locator('.cleat-bow')).toHaveAttribute('data-load','slack');
 const button=await page.locator('#map-ropes [data-rope=bow][data-action=shorten]').boundingBox();await page.mouse.move(button.x+button.width/2,button.y+button.height/2);await page.mouse.down();for(let i=0;i<25&&await page.locator('.cleat-bow').getAttribute('data-load')==='slack';i++)await page.clock.runFor(200);await expect(page.locator('.cleat-bow')).toHaveAttribute('data-load','taut');await expect(page.locator('#map-load-bow')).toContainText('OK do cumowania');await page.mouse.up();
});

test('trailer menus exist only in the SUV and remain accessible through the station selector below the helm',async({page})=>{
 await page.clock.install();await page.goto('/');await page.locator('#start-location').selectOption('trailer');await page.locator('#begin-session').click();await expect(page.locator('.tow-console')).toBeVisible();await expect(page.locator('.winch-controls')).toBeVisible();await expect(page.locator('.slip-panel')).toBeVisible();await page.locator('[data-vehicle=boat]').click();await expect(page.locator('.tow-console')).toBeHidden();await expect(page.locator('.winch-controls')).toBeHidden();await expect(page.locator('.slip-panel')).toBeHidden();await page.locator('[data-vehicle=suv]').click();await expect(page.locator('.tow-console')).toBeVisible();
});

test('rendered SUV camera shows more behind in reverse and more ahead in drive, preserving the same physical zoom',async({page})=>{
 await page.goto('/');const cameras=await page.evaluate(async()=>{
  const{createBoat}=await import('/src/physics.js'),{createTowRig}=await import('/src/towing.js'),{renderWorld}=await import('/src/render.js');const b=createBoat('lake'),r=createTowRig(b,{loaded:true}),canvas=document.createElement('canvas');canvas.width=800;canvas.height=500;const ctx=canvas.getContext('2d'),state={boat:b,towRig:r,focus:r.car,env:{},width:800,height:500,zoom:1,follow:true,overview:false};
  r.gear='R';const reverse=renderWorld(ctx,state);r.gear='D';const drive=renderWorld(ctx,state);return{carY:r.car.y,reverse,drive};
 });expect(cameras.reverse.camera.y).toBeGreaterThan(cameras.carY+9);expect(cameras.drive.camera.y).toBeLessThan(cameras.carY-9);expect(cameras.reverse.scale).toBe(cameras.drive.scale);
});
