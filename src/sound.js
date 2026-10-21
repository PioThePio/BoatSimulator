import {clamp,waveHeight,weatherAt} from './world.js';
export function soundParameters(b,e={}){
 const speed=Math.hypot(b.telemetry.surge??0,b.telemetry.sway??0),weather=weatherAt(b.time,e);
 return{engines:b.engines.map(en=>({frequency:Math.max(12,en.rpm/60*(b.spec.jet?2.5:b.spec.profile==='cruiser'?3:2)),level:en.key==='running'?.035+.045*en.n:en.key==='starting'?.055:0,cutoff:en.key==='starting'?900:250+en.rpm*.45,starting:en.key==='starting',rpm:en.rpm})),
  waves:clamp(waveHeight(e,b.time)*.15+weather.windSpeed*.001,0,.10),
  wash:clamp(speed/22,0,1)*(.012+.07*b.planing)+clamp(Math.abs(b.telemetry.thrust??0)/7000,0,1)*.018,
  waterCutoff:500+clamp(speed/20,0,1)*3200,
  thrusters:['bow','stern'].map(end=>Math.abs(b.thrusters[end+'Actual']??0)*.045),pump:b.fuel.refueling?.025:0};
}
// Procedural Web Audio: no downloads, copyrighted recordings or dependency on a
// media server. The context is created/resumed only inside a user gesture.
export function createSoundscape({context=null}={}){
 let ctx=context,graph=null,enabled=true,volume=.45,active=false,previous=null,boatRef=null,failed=false;
 const target=(param,value,tau=.045)=>param.setTargetAtTime(value,ctx.currentTime,tau);
 function build(){
  if(graph||!ctx)return;
  const master=ctx.createGain(),limiter=ctx.createDynamicsCompressor();master.gain.value=0;
  limiter.threshold.value=-14;limiter.knee.value=12;limiter.ratio.value=5;limiter.attack.value=.004;limiter.release.value=.12;
  master.connect(limiter);limiter.connect(ctx.destination);
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate),data=buffer.getChannelData(0);
  let brown=0;for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.12-.06)*.98;data[i]=brown*.6+(Math.random()*2-1)*.18;}
  const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;noise.start();
  function oscillator(type,frequency){const source=ctx.createOscillator();source.type=type;source.frequency.value=frequency;source.start();return source;}
  function panConnect(node,pan){if(ctx.createStereoPanner){const p=ctx.createStereoPanner();p.pan.value=pan;node.connect(p);p.connect(master);}else node.connect(master);}
  function noiseVoice(frequency,pan=0){const filter=ctx.createBiquadFilter(),gain=ctx.createGain();filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.6;gain.gain.value=0;noise.connect(filter);filter.connect(gain);panConnect(gain,pan);return{filter,gain};}
  const engines=[-.26,.26].map(pan=>{
   const source=oscillator('triangle',25),harmonic=oscillator('sawtooth',50),mechanical=oscillator('triangle',270),mechanicalMix=ctx.createGain(),mix=ctx.createGain(),filter=ctx.createBiquadFilter(),gain=ctx.createGain();
   mechanicalMix.gain.value=.10;mechanical.connect(mechanicalMix);mechanicalMix.connect(filter);mix.gain.value=.22;source.connect(filter);harmonic.connect(mix);mix.connect(filter);filter.type='lowpass';filter.frequency.value=300;gain.gain.value=0;filter.connect(gain);panConnect(gain,pan);
   return{source,harmonic,mechanical,filter,gain};
  });
  const thrusters=[-.15,.15].map(pan=>{const source=oscillator('sawtooth',145),gain=ctx.createGain();gain.gain.value=0;source.connect(gain);panConnect(gain,pan);return{source,gain};});
  const pump={source:oscillator('sine',95),gain:ctx.createGain()};pump.gain.gain.value=0;pump.source.connect(pump.gain);pump.gain.connect(master);
  graph={master,buffer,engines,thrusters,pump,waves:noiseVoice(240),wash:noiseVoice(1100)};
 }
 function pulse(frequency,level,duration=.12,noisy=false){
  if(!graph||!enabled||!active)return;
  const gain=ctx.createGain(),filter=ctx.createBiquadFilter(),source=noisy?ctx.createBufferSource():ctx.createOscillator(),now=ctx.currentTime;
  if(noisy){source.buffer=graph.buffer;filter.type='lowpass';filter.frequency.value=frequency;}else{source.type='triangle';source.frequency.setValueAtTime(frequency,now);source.frequency.exponentialRampToValueAtTime(Math.max(20,frequency*.4),now+duration);}
  source.connect(filter);filter.connect(gain);gain.connect(graph.master);gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(level,now+.006);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
  source.start(now);source.stop(now+duration+.02);source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
 }
 function unlock(){
  if(!enabled||failed)return Promise.resolve();
  try{
   if(!ctx){const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Constructor){failed=true;return Promise.resolve();}ctx=new Constructor();}
   build();return ctx.state!=='running'&&ctx.resume?Promise.resolve(ctx.resume()).catch(()=>{}):Promise.resolve();
  }catch{failed=true;return Promise.resolve();}
 }
 if(ctx)build();
 return{
  unlock,
  setEnabled(value){enabled=!!value;if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  setVolume(value){volume=clamp(value,0,1);if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  setActive(value){active=!!value;if(graph)target(graph.master.gain,enabled&&active?volume*.8:0);},
  state(){return failed?'unsupported':!enabled?'muted':!ctx?'waiting':ctx.state;},
  update(b,e={},isActive=true){
   active=!!isActive;
   if(!graph)return;
   target(graph.master.gain,enabled&&active?volume*.8:0);
   const values=soundParameters(b,e);
   values.engines.forEach((en,i)=>{const v=graph.engines[i];target(v.source.frequency,en.starting?95:en.frequency);target(v.harmonic.frequency,en.starting?185:en.frequency*2.015);target(v.mechanical.frequency,en.starting?350:120+en.frequency*6);target(v.filter.frequency,en.cutoff);target(v.gain.gain,en.level*(en.starting?.55+.45*Math.sin(b.time*25)**2:1));});
   for(let i=values.engines.length;i<graph.engines.length;i++)target(graph.engines[i].gain.gain,0);
   target(graph.waves.gain.gain,values.waves*(.75+.25*Math.sin(b.time*1.3)));target(graph.wash.gain.gain,values.wash);target(graph.wash.filter.frequency,values.waterCutoff);
   values.thrusters.forEach((v,i)=>{target(graph.thrusters[i].gain.gain,v);target(graph.thrusters[i].source.frequency,135+v*1200);});target(graph.pump.gain.gain,values.pump);
   if(boatRef!==b){boatRef=b;previous=null;}
   if(previous&&active){
    b.engines.forEach((en,i)=>{const old=previous.engines[i];if(!old)return;const command=i?b.throttle2:b.throttle;if(Math.sign(command)!==old.command)pulse(900,.04,.045);if(en.key!==old.key)pulse(650,.045,.055);if(en.gear!==old.gear)pulse(en.gear?140:220,.10,.10,true);});
    if(b.lastImpact&&b.lastImpact!==previous.impact){const q=b.lastImpact,level=clamp(.03+Math.sqrt(q.energy)*.003,.03,.24);pulse(q.protectedContact?90:320,level,q.protectedContact?.18:.28,!q.protectedContact);}
    if(b.events[0]!==previous.event&&/pękła|zerw|Zerw/.test(b.events[0]?.message??''))pulse(1900,.13,.12,true);
   }
   previous={engines:b.engines.map((en,i)=>({key:en.key,gear:en.gear,command:Math.sign(i?b.throttle2:b.throttle)})),impact:b.lastImpact,event:b.events[0]};
  },
 };
}
