import {nearbyEngines} from './spatial-audio.js';
import {windSound} from './wind-response.js';
import {turboParameters} from './racing.js';
import {clamp,waveHeight,weatherAt} from './world.js';
export function soundParameters(b,e={}){
 const speed=Math.hypot(b.telemetry.surge??0,b.telemetry.sway??0),weather=weatherAt(b.time,e);
 const plane=clamp((b.planing-.2)/.6,0,1),skimming=plane*plane*(3-2*plane),car=b.spec.profile==='suv';
 return{wind:windSound(weather.windSpeed,e.windSound!==false),engines:b.engines.map(en=>{
   const running=en.key==='running',starting=en.key==='starting',v8=!b.spec.jet&&en.hp>=150;
   const load=running?clamp(en.load,0,1):0,working=running&&en.gear!==0;
   const wet=clamp(en.immersion,0,1),vent=clamp(en.ventilation,0,1);
   // Water receives braking power only after the gearbox actually engages.
   const braking=working&&wet>0?Math.abs(en.thrust)*Math.max(0,-en.gear*en.inflow):0;
   const bubbles=working?en.n**2*vent*clamp(wet/.25,0,1):0;
   const raising=working?en.n*4*wet*(1-wet)*clamp(en.trimRate/.1,0,1):0;
   const churn=running&&!b.spec.air?clamp(.10*Math.sqrt(braking/30000)+.075*bubbles+.045*raising,0,.15):0;
   return{timbre:b.spec.diesel?'diesel':b.spec.jet?'jet':v8?'v8':'light',clatter:running&&b.spec.diesel?.055*(1+.35*load)*(1-.3*en.n):0,firingRate:en.rpm/60*2,carStarter:car&&starting,starterFrequency:155+35*clamp((en.startTime??0)/.25,0,1),frequency:Math.max(12,en.rpm/60*(b.spec.diesel?1.5:b.spec.jet?2.5:v8?1:b.spec.profile==='cruiser'?3:2)),
    harmonicRatio:b.spec.diesel?3:v8?4:2.015,harmonicMix:v8?.065+.095*load:.10+.08*load,bass:v8?.22:0,mechanicalMix:v8?.025:.035,
    level:running?(.013+.020*en.n)*(1+.15*load)*(b.spec.racing?1.25:1):starting&&!car?.038:0,
    cutoff:starting?750:v8?220+en.rpm*.11+load*180:260+en.rpm*(b.spec.jet?.28:.23)+load*220,
    exhaust:running?(v8?.025:.008)+(v8?.070:.030)*en.n*(.2+.8*load):0,exhaustCutoff:130+en.n*(v8?270:500)+load*140,
    churn,churnCutoff:350+vent*500+clamp(braking/30000,0,1)*300,bubbleRate:4+en.n*7+Math.min(3,en.opposingFlow*.3),
    turbo:b.spec.racing?turboParameters(en):null,starting,rpm:en.rpm,load};
  }),
  waves:clamp(waveHeight(e,b.time)*.15+weather.windSpeed*.001,0,.10),
  wash:clamp(speed/22,0,1)*(.012+.07*b.planing)+clamp(Math.abs(b.telemetry.thrust??0)/7000,0,1)*.018,
  waterCutoff:500+clamp(speed/8,0,1)*650,
  skimming,spray:skimming*clamp(speed/16,0,1)*.14,sprayCutoff:1400+clamp(speed/22,0,1)*1300,
  tyres:car?clamp(b.tyreSlip??0,0,1)*.10:0,fan:b.spec.air&&b.engines[0].key==='running'?.015+.075*b.engines[0].n:0,winch:Math.abs(b.towRig?.winch?.rate??0)>.001?.028:0,commandClick:!car,bilgePump:!car&&b.bilge?.running?.035:0,bilgeSlosh:!car?clamp(b.bilge?.level??0,0,1)*clamp(Math.abs(b.rollVelocity)+Math.abs(b.pitchVelocity)+speed*.02,0,.8)*.08:0,bilgeAlarm:!car&&!!b.bilge?.alarm,
  ignitionAlarm:b.electrics?.master!==false&&!b.suppressIgnitionAlarm&&b.engines.some(en=>en.key==='ignition'),
  temperatureAlarm:b.electrics?.master!==false&&!car&&b.battery.soc>.001&&b.engines.some(en=>en.key!=='off'&&(en.temperature>=105||en.thermalTrip)),
  trimPump:b.spec.jet||b.spec.air||b.spec.propulsion==='inboard'?0:clamp(Math.max(...b.engines.map(en=>Math.abs(en.trimRate??0)))/.1,0,1),
  thrusters:['bow','stern'].map(end=>Math.abs(b.thrusters[end+'Actual']??0)*.085),pump:b.fuel.refueling?.025:0};
}
// Procedural Web Audio: no downloads, copyrighted recordings or dependency on a
// media server. The context is created/resumed only inside a user gesture.
export function createSoundscape({context=null}={}){
 let ctx=context,graph=null,enabled=true,volume=.45,engineVolume=1,active=false,previous=null,boatRef=null,failed=false;
 const targets=new WeakMap();let sarState=null,sarSequence=0;
 const target=(param,value,tau=.045)=>{if(targets.has(param)&&Math.abs(targets.get(param)-value)<.00001)return;targets.set(param,value);if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(ctx.currentTime);else param.cancelScheduledValues(ctx.currentTime);param.setTargetAtTime(value,ctx.currentTime,tau);};
 function build(){
  if(graph||!ctx)return;
  const master=ctx.createGain(),limiter=ctx.createDynamicsCompressor();master.gain.value=0;
  limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.12;
  master.connect(limiter);limiter.connect(ctx.destination);
  const engineMaster=ctx.createGain();engineMaster.gain.value=engineVolume;engineMaster.connect(master);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
  let brown=0;for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.12-.06)*.98;data[i]=brown*.6+(Math.random()*2-1)*.18;}
  const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;noise.start();
  function oscillator(type,frequency){const source=ctx.createOscillator();source.type=type;source.frequency.value=frequency;source.start();return source;}
  function panConnect(node,pan,destination=master){if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(destination);}else node.connect(destination);}
  function noiseVoice(frequency,pan=0,bubbling=false,destination=master){
   const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.6;gain.gain.value=0;noise.connect(filter);filter.connect(gain);
   let flutter;
   if(bubbling){const tremolo=ctx.createGain(),depth=ctx.createGain();flutter=oscillator('sine',6);tremolo.gain.value=.65;depth.gain.value=.35;flutter.connect(depth);depth.connect(tremolo.gain);gain.connect(tremolo);panConnect(tremolo,pan,destination);}else panConnect(gain,pan,destination);
   return{filter,gain,flutter};
  }
  // A crank pulse with strong low orders and the fourth firing order gives a
  // stylised V8 exhaust. This is a chosen timbre, not an engine cylinder count.
  const v8Wave=ctx.createPeriodicWave(new Float32Array(9),new Float32Array([0,.85,.26,.12,.13,.035,.025,.01,.008]));
  const engines=[-.26,.26].map(pan=>{
   const source=oscillator('triangle',25),harmonic=oscillator('triangle',50),mechanical=oscillator('sine',270),bass=oscillator('sine',12),bassMix=ctx.createGain(),mechanicalMix=ctx.createGain(),mix=ctx.createGain(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   bassMix.gain.value=0;bass.connect(bassMix);bassMix.connect(filter);mechanicalMix.gain.value=.035;mechanical.connect(mechanicalMix);mechanicalMix.connect(filter);mix.gain.value=.10;source.connect(filter);harmonic.connect(mix);mix.connect(filter);filter.type='lowpass';filter.Q.value=.5;filter.frequency.value=300;gain.gain.value=0;filter.connect(gain);panConnect(gain,pan,engineMaster);
   const turbo={source:oscillator('sine',850),gain:ctx.createGain(),air:noiseVoice(1800,pan,false,engineMaster)};turbo.gain.gain.value=0;turbo.source.connect(turbo.gain);panConnect(turbo.gain,pan,engineMaster);
   // Noise multiplied by a short combustion pulse produces diesel knock,
   // rather than merely lowering the pitch of the petrol oscillator.
   const clatter=noiseVoice(1450,pan,false,engineMaster),gate=ctx.createGain(),pulse=oscillator('sine',25),depth=ctx.createGain();
   clatter.gain.disconnect();clatter.gain.connect(gate);panConnect(gate,pan,engineMaster);gate.gain.value=.5;depth.gain.value=.5;pulse.connect(depth);depth.connect(gate.gain);
   const coefficients=new Float32Array(13);for(let j=1;j<coefficients.length;j++)coefficients[j]=.16*(1-j/13);pulse.setPeriodicWave(ctx.createPeriodicWave(coefficients,new Float32Array(13)));clatter.pulse=pulse;
   return{clatter,turbo,source,harmonic,mechanical,bass,bassMix,mechanicalMix,mix,filter,gain,exhaust:noiseVoice(240,pan,true,engineMaster),churn:noiseVoice(450,pan,true),timbre:'light'};
  });
  // Tunnel thrust is mostly turbulent water. No sustained pitched oscillator.
  const thrusters=[-.15,.15].map(pan=>noiseVoice(520,pan));
  const alarm={source:oscillator('sine',1050),gain:ctx.createGain()};alarm.gain.gain.value=0;
  alarm.source.connect(alarm.gain);alarm.gain.connect(master);
  const pump={source:oscillator('sine',95),gain:ctx.createGain()};pump.gain.gain.value=0;pump.source.connect(pump.gain);pump.gain.connect(master);
  const trim={source:oscillator('triangle',185),gain:ctx.createGain(),noise:noiseVoice(720)};trim.gain.gain.value=0;trim.source.connect(trim.gain);trim.gain.connect(master);
  const starter={source:oscillator('sawtooth',180),gain:ctx.createGain(),filter:ctx.createBiquadFilter(),noise:noiseVoice(1500,0,true,engineMaster)};
  starter.filter.type='lowpass';starter.filter.frequency.value=850;starter.gain.gain.value=0;starter.source.connect(starter.filter);starter.filter.connect(starter.gain);starter.gain.connect(engineMaster);
  const tyres=noiseVoice(550,0,true),fan=noiseVoice(900,0,true),winch=noiseVoice(190);
  const bilge={pump:noiseVoice(180,0,true),slosh:noiseVoice(400,0,true),alarm:oscillator('sine',760),gain:ctx.createGain()};bilge.gain.gain.value=0;bilge.alarm.connect(bilge.gain);bilge.gain.connect(master);
  const whiteBuffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),whiteData=whiteBuffer.getChannelData(0);for(let i=0;i<whiteData.length;i++)whiteData[i]=Math.random()*2-1;
  const wind={source:ctx.createBufferSource(),filter:ctx.createBiquadFilter(),gain:ctx.createGain()};wind.source.buffer=whiteBuffer;wind.source.loop=true;wind.filter.type='lowpass';wind.filter.frequency.value=250;wind.filter.Q.value=.5;wind.gain.gain.value=0;wind.source.connect(wind.filter);wind.filter.connect(wind.gain);wind.gain.connect(master);wind.source.start();
  const remotes=Array.from({length:4},()=>{const bus=ctx.createGain(),pan=ctx.createStereoPanner?.(),source=oscillator('triangle',25),bass=oscillator('sine',12),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),bassGain=ctx.createGain();gain.gain.value=bassGain.gain.value=0;filter.type='lowpass';source.connect(filter);filter.connect(gain);gain.connect(bus);bass.connect(bassGain);bassGain.connect(bus);if(pan){bus.connect(pan);pan.connect(engineMaster);}else bus.connect(engineMaster);return{source,bass,filter,gain,bassGain,pan,noise:noiseVoice(240,0,true,bus),key:null};});
  graph={remotes,wind,master,engineMaster,buffer,whiteBuffer,engines,thrusters,pump,trim,alarm,starter,bilge,tyres,fan,winch,v8Wave,waves:noiseVoice(240),wash:noiseVoice(1100),spray:noiseVoice(1900,-.35),sprayRight:noiseVoice(2300,.35)};
 }
 function pulse(frequency,level,duration=.12,noisy=false,engineOnly=false,delay=0){
  if(!graph||!enabled||!active)return;
  const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),source=noisy?ctx.createBufferSource():ctx.createOscillator(),now=ctx.currentTime+delay;
  filter.Q.value=.5;
  if(noisy){source.buffer=graph.buffer;filter.type='lowpass';filter.frequency.value=frequency;}else{source.type='triangle';filter.type='lowpass';filter.frequency.value=Math.max(1000,frequency*2.5);source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.4),now+duration);}
  source.connect(filter);filter.connect(gain);gain.connect(engineOnly?graph.engineMaster:graph.master);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.start(now);source.stop(now+duration+.02);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function unlock(){
  if(!enabled||failed)return Promise.resolve();
  try{
   if(!ctx){const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Constructor){failed=true;return Promise.resolve();}ctx=new Constructor();}
   build();return ctx.state!=='running'&&ctx.resume?Promise.resolve(ctx.resume()).catch(()=>{}):Promise.resolve();
  }catch{failed=true;return Promise.resolve();}
 }
 function blowOff(strength){
  if(!enabled||!active)return;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),gain=ctx.createGain(),now=ctx.currentTime;
  source.buffer=graph.whiteBuffer;filter.type='bandpass';filter.Q.value=.55;filter.frequency.setValueAtTime(2600,now);filter.frequency.exponentialRampToValueAtTime(950,now+.35);
  source.connect(filter);filter.connect(gain);gain.connect(graph.engineMaster);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(.09*Math.sqrt(clamp(strength,.2,1)),now+.015);gain.gain.exponentialRampToValueAtTime(.0001,now+.38);
  source.start(now);source.stop(now+.4);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 if(ctx)build();
 return{
  unlock,
  setEnabled(value){enabled=!!value;if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  setVolume(value){volume=clamp(value,0,1);if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  setEngineVolume(value){engineVolume=clamp(value,0,2);if(graph)target(graph.engineMaster.gain,engineVolume);},
  setActive(value){active=!!value;if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  state(){return failed?'unsupported':!enabled?'muted':!ctx?'waiting':ctx.state;},
  update(b,e={},isActive=true,external={}){
   active=!!isActive;
   if(!graph)return;
   target(graph.master.gain,enabled&&active?volume*.8:0);
   const remote=nearbyEngines(external.boats,external.listener??b,external.listenerId??b.id),used=new Set();
   for(const item of remote){let voice=graph.remotes.find(v=>v.key===item.id&&!used.has(v));voice??=graph.remotes.find(v=>!used.has(v));used.add(voice);voice.key=item.id;const params=soundParameters(item.boat,e).engines[item.index];if(params.timbre==='v8')voice.source.setPeriodicWave(graph.v8Wave);else voice.source.type='triangle';target(voice.source.frequency,params.frequency);target(voice.bass.frequency,Math.max(8,params.frequency*.5));target(voice.filter.frequency,params.cutoff);target(voice.gain.gain,params.level*item.gain,.12);target(voice.bassGain.gain,params.level*params.bass*item.gain,.12);target(voice.noise.gain.gain,params.exhaust*item.gain,.12);target(voice.noise.filter.frequency,params.exhaustCutoff);if(voice.pan)target(voice.pan.pan,item.pan,.15);}
   for(const v of graph.remotes)if(!used.has(v)){target(v.gain.gain,0,.15);target(v.bassGain.gain,0,.15);target(v.noise.gain.gain,0,.15);v.key=null;}
   const state=external.rescue;if(state!==sarState){sarState=state;sarSequence=state?.alarmSequence??0;}else if((state?.alarmSequence??0)>sarSequence){sarSequence=state.alarmSequence;for(const delay of [0,.22,.44])pulse(1350,.09,.13,false,false,delay);}
   const values=soundParameters(b,e);target(graph.wind.gain.gain,values.wind.level,.12);target(graph.wind.filter.frequency,values.wind.cutoff,.18);target(graph.tyres.gain.gain,values.tyres);target(graph.tyres.flutter.frequency,9+Math.abs(b.engines[0].rpm/800));target(graph.fan.gain.gain,values.fan);target(graph.fan.filter.frequency,600+1200*b.engines[0].n);target(graph.winch.gain.gain,values.winch);
   const starter=values.engines.find(en=>en.carStarter),compression=.55+.45*Math.sin(b.time*2*Math.PI*13)**2;
   target(graph.starter.gain.gain,starter?.024*compression:0,.012);target(graph.starter.source.frequency,(starter?.starterFrequency??180)*(1+.035*Math.sin(b.time*2*Math.PI*13)),.012);target(graph.starter.noise.gain.gain,starter?.065:0,.015);target(graph.starter.noise.flutter.frequency,13);
   target(graph.bilge.pump.gain.gain,values.bilgePump);target(graph.bilge.slosh.gain.gain,values.bilgeSlosh);target(graph.bilge.gain.gain,values.bilgeAlarm?.035*(Math.sin(b.time*8)>0?1:.25):0);
   values.engines.forEach((en,i)=>{
    const v=graph.engines[i];target(v.turbo.gain.gain,en.turbo?.level??0,.12);target(v.turbo.source.frequency,en.turbo?.frequency??850,.15);target(v.turbo.air.gain.gain,en.turbo?.airLevel??0,.12);target(v.clatter.gain.gain,en.clatter);target(v.clatter.pulse.frequency,Math.max(5,en.firingRate));
    if(v.timbre!==en.timbre){if(en.timbre==='v8')v.source.setPeriodicWave(graph.v8Wave);else v.source.type='triangle';v.timbre=en.timbre;}
    target(v.source.frequency,en.starting?95:en.frequency);target(v.harmonic.frequency,en.starting?185:en.frequency*en.harmonicRatio);target(v.bass.frequency,Math.max(8,en.frequency*.5));
    target(v.mix.gain,en.harmonicMix);target(v.bassMix.gain,en.starting?0:en.bass);target(v.mechanicalMix.gain,en.mechanicalMix);target(v.mechanical.frequency,en.starting?350:120+en.frequency*(en.timbre==='v8'?4:6));
    target(v.filter.frequency,en.cutoff);target(v.gain.gain,en.level*(en.starting?.55+.45*Math.sin(b.time*25)**2:1));
    target(v.exhaust.gain.gain,en.exhaust);target(v.exhaust.filter.frequency,en.exhaustCutoff);target(v.exhaust.flutter.frequency,Math.max(6,en.frequency*(en.timbre==='v8'?4:2)));target(v.churn.gain.gain,en.churn);target(v.churn.filter.frequency,en.churnCutoff);target(v.churn.flutter.frequency,en.bubbleRate);
   });
   for(let i=values.engines.length;i<graph.engines.length;i++){const v=graph.engines[i];target(v.turbo.gain.gain,0);target(v.turbo.air.gain.gain,0);target(v.clatter.gain.gain,0);target(v.gain.gain,0);target(v.exhaust.gain.gain,0);target(v.churn.gain.gain,0);}
   target(graph.waves.gain.gain,values.waves*(.75+.25*Math.sin(b.time*1.3)));target(graph.wash.gain.gain,values.wash*(1-.72*values.skimming));target(graph.wash.filter.frequency,values.waterCutoff);
   target(graph.spray.gain.gain,values.spray*.65);target(graph.spray.filter.frequency,values.sprayCutoff);target(graph.sprayRight.gain.gain,values.spray*.55);target(graph.sprayRight.filter.frequency,values.sprayCutoff*1.2);
   values.thrusters.forEach((v,i)=>{target(graph.thrusters[i].gain.gain,v);target(graph.thrusters[i].filter.frequency,420+v*2200);});target(graph.pump.gain.gain,values.pump);target(graph.alarm.gain.gain,(values.ignitionAlarm||values.temperatureAlarm)?.045:0,.025);
   target(graph.trim.gain.gain,values.trimPump*.022);target(graph.trim.noise.gain.gain,values.trimPump*.055);target(graph.trim.source.frequency,175+values.trimPump*28);
   if(boatRef!==b){boatRef=b;previous=null;}
   if(previous&&active){
    let release=0;
    b.engines.forEach((en,i)=>{const old=previous.engines[i];if(!old)return;const command=i?b.throttle2:b.throttle;if(b.spec.racing){const turbo=turboParameters(en,{...old,command:old.commandValue});if(turbo.bov)release=Math.max(release,turbo.bovStrength);}if(values.commandClick&&Math.sign(command)!==old.command)pulse(900,.085,.055);if(en.key!==old.key)pulse(650,.09,.065);if(en.gear!==old.gear){pulse(en.gear?650:850,.22,.10,true);pulse(en.gear?155:210,.09,.08);}});
    if(release)blowOff(release);
    if(b.lastImpact&&b.lastImpact!==previous.impact){const q=b.lastImpact,level=clamp(.12+Math.sqrt(q.energy)*.003,.12,.30);pulse(q.protectedContact?145:105,level,q.protectedContact?.17:.24);pulse(q.protectedContact?600:1400,level*(q.protectedContact?.5:1),q.protectedContact?.10:.20,true);}
    if(b.events[0]!==previous.event&&/pękła|zerw|Zerw/.test(b.events[0]?.message??''))pulse(1900,.22,.12,true);
   }
   previous={engines:b.engines.map((en,i)=>({boost:b.spec.racing?turboParameters(en).boost:0,bovSequence:en.bovSequence??0,key:en.key,gear:en.gear,commandValue:en.command,command:Math.sign(i?b.throttle2:b.throttle)})),impact:b.lastImpact,event:b.events[0]};
  },
 };
}
