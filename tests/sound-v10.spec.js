import {test,expect} from '@playwright/test';

test('rendered V8 is bassier than small outboards and PWC; loading changes its sound even at constant RPM',async({page})=>{
 await page.goto('/');
 const audio=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(options,load=.2){
   const context=new OfflineAudioContext(2,57600,48000),sound=createSoundscape({context}),b=createBoat('lake',options);
   Object.assign(b.engines[0],{rpm:3600,n:.7,gear:1,load});sound.update(b,{},true);
   const data=(await context.startRendering()).getChannelData(0);let energy=0,lowEnergy=0,diffEnergy=0,low1=0,low2=0,peak=0;
   const a=1-Math.exp(-2*Math.PI*180/48000);
   for(let i=0;i<data.length;i++){low1+=a*(data[i]-low1);low2+=a*(low1-low2);if(i>24000){energy+=data[i]**2;lowEnergy+=low2**2;diffEnergy+=(data[i]-data[i-1])**2;peak=Math.max(peak,Math.abs(data[i]));}}
   return{rms:Math.sqrt(energy/(data.length-24001)),bass:lowEnergy/energy,brightness:Math.sqrt(diffEnergy/energy),peak};
  }
  return{small:await render({powers:[90]}),v8:await render({powers:[150]}),jet:await render({profile:'pwc',powers:[350]}),loaded:await render({powers:[150]},.95)};
 });
 expect(audio.v8.rms).toBeGreaterThan(.0001);expect(audio.v8.bass).toBeGreaterThan(audio.small.bass*1.1);expect(audio.v8.bass).toBeGreaterThan(audio.jet.bass*1.1);
 expect(audio.v8.brightness).toBeLessThan(audio.small.brightness*.8);expect(audio.v8.brightness).toBeLessThan(audio.jet.brightness*.8);expect(audio.loaded.brightness).toBeGreaterThan(audio.v8.brightness*1.05);
 for(const q of Object.values(audio))expect(q.peak).toBeLessThan(.6);
});

test('actual bubbling produces an extra audio layer and is silent with the prop fully out of water',async({page})=>{
 await page.goto('/');
 const result=await page.evaluate(async()=>{
  const {createSoundscape}=await import('/src/sound.js'),{createBoat}=await import('/src/physics.js');
  async function render(immersion,inflow,ventilation=.6){
   const context=new OfflineAudioContext(2,48000,48000),random=Math.random;let seed=7,sound;
   try{Math.random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};sound=createSoundscape({context});}finally{Math.random=random;}
   const b=createBoat('lake');
   Object.assign(b.engines[0],{rpm:3600,n:.8,gear:-1,load:0,thrust:immersion?-2500:0,immersion,inflow,ventilation,trimRate:.16});sound.update(b,{},true);
   return(await context.startRendering()).getChannelData(0);
  }
  const quiet=await render(1,-6),braking=await render(1,6),raising=await render(.5,-6),dry=await render(0,-6),clean=await render(1,-6,0);
  const difference=data=>{let e=0;for(let i=24000;i<48000;i++)e+=(data[i]-dry[i])**2;return Math.sqrt(e/24000);};
  const {soundParameters}=await import('/src/sound.js'),off=createBoat('lake');off.engines[0].key='off';
  return{braking:difference(braking),raising:difference(raising),wet:difference(quiet),dry:difference(clean),stopped:soundParameters(off).engines[0].churn};
 });
 expect(result.braking).toBeGreaterThan(.0003);expect(result.raising).toBeGreaterThan(.0003);expect(result.braking).toBeGreaterThan(result.wet);expect(result.dry).toBeLessThan(.000001);expect(result.stopped).toBe(0);
});

test('draft and live under-keel clearance sit beside attitude, respond to fuel, and fit on a phone',async({page})=>{
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.locator('#craft').selectOption('cabin');await page.locator('#begin-session').click();
  await expect(page.locator('#hull-draft')).toHaveText('0.55 m');await expect(page.locator('#keel-clearance')).toContainText('m');
  const info=page.locator('.draft-readings');await info.scrollIntoViewIfNeeded();const bounds=await info.boundingBox();expect(bounds.x).toBeGreaterThanOrEqual(0);expect(bounds.x+bounds.width).toBeLessThanOrEqual(width);
  const read=await page.evaluate(async()=>{
   const {createBoat}=await import('/src/physics.js'),{updateAttitude}=await import('/src/instruments.js'),{updateMass}=await import('/src/craft.js'),b=createBoat('lake',{fuelCapacity:800});
   b.underKeel=.12;updateAttitude(b,{});const before=document.querySelector('#hull-draft').textContent;updateMass(b.spec,800);updateAttitude(b,{});
   const after=document.querySelector('#hull-draft').textContent,clearance=document.querySelector('#keel-clearance'),shallow=clearance.classList.contains('warning');
   b.grounded=true;b.underKeel=0;updateAttitude(b,{});return{before,after,shallow,ground:clearance.textContent,danger:clearance.classList.contains('danger')};
  });
  expect(parseFloat(read.after)).toBeGreaterThan(parseFloat(read.before));expect(read.shallow).toBe(true);expect(read.ground).toBe('NA DNIE · 0.00 m');expect(read.danger).toBe(true);
  await page.screenshot({path:`/tmp/boat-v10-draft-${width}.png`,fullPage:false});
 }
});
