import {throttleStep} from './controls.js';
import {engineKey} from './craft.js';
import {trimStep} from './drive.js';
import {gauge,attitudeMarkup,updateAttitude} from './instruments.js';
import {requestRefuel} from './systems.js';
import {requestRepair} from './service.js';
import {conditionMarkup,updateContactInstrument} from './contact-instrument.js';
const $=s=>document.querySelector(s);
export function installCockpit(api){
 $('#instruments').innerHTML=gauge('rpm','OBROTOMIERZ',0,6500,'obr/min')+gauge('rpm2','OBROTY · PRAWY',0,6500,'obr/min')+gauge('speed','PRĘDKOŚĆ',0,60,'kn')+gauge('fuel','PALIWO',0,100,'L/h')+gauge('trim','TRYM',0,100,'%')+gauge('volt','AKUMULATOR',8,16,'V')+gauge('temp','TEMPERATURA',20,140,'°C')+attitudeMarkup();
 $('.pitch-gauge').insertAdjacentHTML('beforeend',conditionMarkup());
 for(let i=0;i<2;i++){
  $('#ignition-'+i).innerHTML=`<div class="ignition"><span class="key-positions">0 · I · START</span><div class="key-row"><button data-key-turn="-1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w lewo">↶</button><button id="key-${i}" class="key-knob" data-engine="${i}" aria-label="Stacyjka silnika ${i+1}: lewa połowa wyłącza, prawa uruchamia"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="24"/><g class="key-pointer"><path d="M23 12h8v29h-8Z"/><circle cx="27" cy="14" r="3"/></g></svg></button><button data-key-turn="1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w prawo">↷</button></div><small id="key-state-${i}" class="key-state">Wyłączony</small><small id="temperature-${i}" class="engine-temperature">18°C</small></div>`;
 }
 function turnKey(index,direction){const b=api.boat(),en=b.engines[index];if(!en)return;const action=direction>0?(en.key==='off'?'ignition':'start'):'off';api.toast(engineKey(b,index,action).message);}
 document.querySelectorAll('[data-key-turn]').forEach(btn=>btn.onclick=()=>turnKey(+btn.dataset.engine,+btn.dataset.keyTurn));
 document.querySelectorAll('.key-knob').forEach(btn=>{btn.onclick=e=>{const r=btn.getBoundingClientRect();turnKey(+btn.dataset.engine,e.detail!==0&&e.clientX<r.left+r.width/2?-1:1);};});
 document.querySelectorAll('[data-gas]').forEach(btn=>btn.onclick=()=>{const dir=+btn.dataset.gas;if(!dir){api.neutral();return;}const b=api.boat(),i=api.selected();api.setThrottle(throttleStep(i?b.throttle2:b.throttle,dir),i);});
 document.querySelectorAll('[data-trim]').forEach(btn=>btn.onclick=()=>{const b=api.boat();if(b.enginesRaised){b.enginesRaised=false;for(const en of b.engines)en.trim=en.trimTarget=1;}const target=trimStep(b.engines[0].trimTarget,+btn.dataset.trim);for(const en of b.engines)en.trimTarget=target;});
 const holds={bow:0,stern:0};api.holds=holds;
 for(const btn of document.querySelectorAll('[data-thruster]')){
  btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);holds[btn.dataset.thruster]=+btn.dataset.force;};
  btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>holds[btn.dataset.thruster]=0;
 }
 const release=()=>holds.bow=holds.stern=0;window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 $('#refuel').onclick=()=>api.toast(requestRefuel(api.boat()).message);
 $('#repair').onclick=()=>api.toast(requestRepair(api.boat()).message);
 $('#sonar-toggle').onchange=e=>$('.sonar').hidden=!e.target.checked;
 return function update(){
  const b=api.boat(),S=b.spec,en=b.engines,avg=k=>en.reduce((sum,e)=>sum+e[k],0)/en.length;
  const trim=b.enginesRaised?1:avg('trim'),temperature=Math.max(...en.map(e=>e.temperature));
  $('#gauge-rpm2').hidden=en.length!==2;$('#instruments').classList.toggle('twins',en.length===2);$('#gauge-rpm .gauge-name').textContent=en.length===2?'OBROTY · LEWY':'OBROTOMIERZ';
  const values={rpm:en[0].rpm,rpm2:en[1]?.rpm??0,speed:Math.hypot(b.vx,b.vy)*1.94384,fuel:100*b.fuel.litres/b.fuel.capacity,trim:100*trim,volt:b.battery.voltage,temp:temperature};
  for(const [id,value]of Object.entries(values)){const el=$('#gauge-'+id),fraction=Math.max(0,Math.min(1,(value-+el.dataset.min)/(+el.dataset.max-+el.dataset.min)));el.querySelector('.needle').style.transform=`rotate(${fraction*180}deg)`;el.querySelector('strong').textContent=value.toFixed(['rpm','rpm2','fuel','trim','temp'].includes(id)?0:1);}
  $('#gauge-fuel strong').textContent=b.fuel.litres.toFixed(1)+' l';$('#gauge-fuel small').textContent=b.fuel.flow.toFixed(1)+' L/h';
  $('#gauge-temp').classList.toggle('danger',temperature>=105);$('#gauge-trim').classList.toggle('disabled',!!S.jet);$('#trim-value').textContent=Math.round((b.enginesRaised?1:en[0].trimTarget)*100)+'%';$('#trim-value').title=(en[0].trimTarget<=.4?'Roboczy trym':'Podnoszenie napędu')+' · pozycja zadana';$('#gauge-trim small').textContent='% · '+(trim<=.4?'TRIM':'TILT');
  updateAttitude(b,api.env);
  updateContactInstrument(b);
  const reserve=b.fuel.litres<b.fuel.capacity*.1,hot=temperature>=105,lowVolt=b.battery.voltage<11.5,highVolt=b.battery.voltage>14.8;
  for(const [id,active,label]of [['fuel',reserve,reserve?'Rezerwa paliwa':'Paliwo powyżej rezerwy'],['temp',hot,hot?'Przegrzanie':'Temperatura poniżej alarmu'],['volt',lowVolt||highVolt,lowVolt?'Niskie napięcie':highVolt?'Za wysokie napięcie':'Napięcie prawidłowe']]){const led=$('#'+id+'-led');led.classList.toggle('lit',active);led.setAttribute('aria-label',label);led.title=label;}
  $('#gauge-volt').classList.toggle('danger',lowVolt||highVolt);$('#gauge-volt small').textContent='V · '+(lowVolt?'NISKIE':highVolt?'WYSOKIE':b.battery.current<0?'ŁADOWANIE':'SPOCZYNEK');
  $('#fuel-status').textContent=`${b.fuel.litres.toFixed(1)} / ${b.fuel.capacity} l · ${b.fuel.flow.toFixed(1)} L/h${b.fuel.refueling?' · TANKOWANIE':b.fuel.status?' · '+b.fuel.status:''}`;
  $('#refuel').textContent=b.fuel.refueling?'■ Stop tankowania':'⛽ Tankuj';
  $('#repair').textContent=b.service.active?'■ Przerwij naprawę':'🔧 Napraw przy slipie';$('#repair-status').textContent=b.service.status+(b.service.active?' · '+Math.round(b.service.progress*100)+'%':'');
  const warnings=[];
  if(en.some(e=>e.overheated||e.thermalTrip))warnings.push('PRZEGRZANIE · zmniejsz gaz i opuść napęd'+(en.some(e=>e.thermalTrip)?' · silnik zatrzymany':''));
  else if(en.some(e=>e.key==='running'&&e.cooling<.25))warnings.push('Brak chłodzenia — opuść napęd');
  if(en.some(e=>e.ventilation>.15))warnings.push('Napowietrzona struga — zmniejsz trym');if(b.fuel.litres<b.fuel.capacity*.1)warnings.push('Rezerwa paliwa');if(b.battery.voltage<11.5)warnings.push('Niskie napięcie');if(b.reeds>.2)warnings.push('Szuwary · większy opór');
  $('#engine-warning').hidden=!warnings.length;$('#engine-warning').textContent=warnings.join(' · ');$('#engine-warning').classList.toggle('critical',en.some(e=>e.overheated||e.thermalTrip));
  for(const [i,e]of en.entries()){
   $('#key-state-'+i).textContent=({off:'Wyłączony',ignition:'Zapłon',starting:'Rozrusznik…',running:'Pracuje'})[e.key];$('#key-'+i+' .key-pointer').style.transform=`rotate(${e.key==='off'?-48:e.key==='starting'?48:0}deg)`;$('#key-'+i).classList.toggle('running',e.key==='running');$('#temperature-'+i).textContent=Math.round(e.temperature)+'°C';$('#temperature-'+i).classList.toggle('danger',e.overheated);
  }
  document.querySelectorAll('[data-trim]').forEach(btn=>btn.disabled=!!S.jet);
  $('#thruster-panel').hidden=!S.bowThruster&&!S.sternThruster;for(const end of ['bow','stern'])$('#thruster-'+end).hidden=!S[end+'Thruster'];
 };
}
