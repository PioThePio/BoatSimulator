import {test,expect} from '@playwright/test';

test('ignition buzzer is continuous, stops at START, and obeys mute and pause',async({page})=>{
 await page.goto('/');
 const results=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(key,enabled=true,active=true){
   const context=new OfflineAudioContext(2,144000,48000),sound=createSoundscape({context}),b=createBoat('lake',{coldStart:true});b.engines[0].key=key;sound.setEnabled(enabled);sound.update(b,{},active);
   const data=(await context.startRendering()).getChannelData(0),bins=[];let re=0,im=0;
   for(let k=0;k<30;k++){let e=0;for(let i=k*4800;i<(k+1)*4800;i++){e+=data[i]**2;re+=data[i]*Math.cos(2*Math.PI*1050*i/48000);im+=data[i]*Math.sin(2*Math.PI*1050*i/48000);}bins.push(Math.sqrt(e/4800));}
   return{bins,tone:Math.hypot(re,im)*2/data.length};
  }
  return{on:await render('ignition'),off:await render('off'),start:await render('starting'),muted:await render('ignition',false),paused:await render('ignition',true,false)};
 });
 expect(Math.min(...results.on.bins.slice(3))).toBeGreaterThan(.003);expect(Math.max(...results.on.bins.slice(3))/Math.min(...results.on.bins.slice(3))).toBeLessThan(1.05);expect(results.on.tone).toBeGreaterThan(.001);
 for(const name of ['off','muted','paused'])expect(Math.max(...results[name].bins)).toBeLessThan(.000001);
 expect(results.start.tone).toBeLessThan(results.on.tone*.02);
});

test('thruster is quiet broadband wash; planing changes the water spectrum',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(kind){
   const context=new OfflineAudioContext(2,57600,48000),sound=createSoundscape({context}),b=createBoat('lake',{coldStart:true});
   if(kind==='thruster')b.thrusters.bowActual=1;else{b.telemetry.surge=12;b.planing=kind==='plane'?1:0;}
   sound.update(b,{},true);const data=(await context.startRendering()).getChannelData(0);let e=0,diff=0,periodic=0;
   for(let i=24000;i<data.length;i++){e+=data[i]**2;diff+=(data[i]-data[i-1])**2;periodic+=data[i]*data[i-254];}
   return{rms:Math.sqrt(e/(data.length-24000)),brightness:Math.sqrt(diff/e),periodic:Math.abs(periodic/e)};
  }
  return{thruster:await render('thruster'),displacement:await render('water'),plane:await render('plane')};
 });
 expect(result.thruster.rms).toBeGreaterThan(.0001);expect(result.thruster.rms).toBeLessThan(.004);expect(result.thruster.periodic).toBeLessThan(.4);
 expect(result.plane.brightness).toBeGreaterThan(result.displacement.brightness*1.3);expect(result.plane.rms).toBeGreaterThan(result.displacement.rms*2);
});

test('lever clicks and fender thumps are distinct above the softer engine and decay without clipping',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(kind){
   const context=new OfflineAudioContext(2,48000,48000),sound=createSoundscape({context}),b=createBoat('lake',{powers:[200]});Object.assign(b.engines[0],{n:.7,rpm:3600,gear:1,load:.5});sound.update(b,{},true);
   const at=context.suspend(.3),rendered=context.startRendering();await at;
   if(kind==='click')b.throttle=.08;if(kind==='fender')b.lastImpact={energy:20,protectedContact:true};if(kind==='hull')b.lastImpact={energy:100,protectedContact:false};sound.update(b,{},true);await context.resume();
   const data=(await rendered).getChannelData(0);let base=0,peak=0,late=0;
   for(let i=7200;i<13200;i++)base+=data[i]**2;for(let i=14400;i<28800;i++)peak=Math.max(peak,Math.abs(data[i]));for(let i=38400;i<48000;i++)late+=data[i]**2;
   return{base:Math.sqrt(base/6000),peak,late:Math.sqrt(late/9600)};
  }
  return{click:await render('click'),fender:await render('fender'),hull:await render('hull')};
 });
 for(const event of Object.values(result)){expect(event.base).toBeLessThan(.014);expect(event.peak).toBeGreaterThan(event.base*2);expect(event.peak).toBeLessThan(.6);expect(event.late).toBeLessThan(event.base*1.2);}
});

test('mooring opens with more clearance from the hull on desktop and touch-sized screens',async({page})=>{
 for(const width of [1440,390,320]){
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.locator('#start-location').selectOption('berth');await page.locator('#begin-session').click();await page.locator('#lake').scrollIntoViewIfNeeded();
  const lake=await page.locator('#lake').boundingBox(),scale=Math.min(lake.width/140,lake.height/80);
  await page.locator('#lake').click({position:{x:lake.width/2+(29-24.3)*scale,y:lake.height/2+(17-22)*scale}});await expect(page.locator('#mooring-picker')).toBeVisible();const popup=await page.locator('#mooring-picker').boundingBox();
  const boatX=lake.x+(width<650?(lake.width<360?24:48):lake.width/2),radius=2.15*scale/2;expect(popup.x-(boatX+radius)).toBeGreaterThanOrEqual(width<360?23:width<650?45:80);expect(popup.x+popup.width).toBeLessThanOrEqual(lake.x+lake.width);
  await page.screenshot({path:`/tmp/boat-v11-mooring-${width}.png`,fullPage:false});
 }
});
