import {throttleStep} from './controls.js';
import {engineKey} from './craft.js';
import {requestRefuel} from './systems.js';
const $=s=>document.querySelector(s);
function gauge(id,title,min,max,unit){return `<div class="gauge" id="gauge-${id}" data-min="${min}" data-max="${max}"><svg viewBox="0 0 120 76" aria-hidden="true"><path d="M14 61a46 46 0 0 1 92 0" class="gauge-arc"/><path d="M60 61h-39" class="needle"/><circle cx="60" cy="61" r="3"/></svg><span>${title}</span><strong>0</strong><small>${unit}</small></div>`;}
export function installCockpit(api){
 $('#instruments').innerHTML=gauge('rpm','OBROTOMIERZ',0,6500,'obr/min')+gauge('rpm2','OBROTY · PRAWY',0,6500,'obr/min')+gauge('speed','PRĘDKOŚĆ',0,60,'kn')+gauge('fuel','PALIWO',0,100,'L/h')+gauge('trim','TRYM',0,100,'%')+gauge('volt','AKUMULATOR',8,16,'V')+gauge('temp','TEMPERATURA',20,140,'°C')+`<div class="pitch-gauge"><span>UNIESIENIE DZIOBU / NAPĘD</span><svg viewBox="0 0 170 70" aria-label="Położenie kadłuba i trym silnika"><path d="M3 52h162" stroke="#8cae9d" stroke-dasharray="3 3"/><g id="bow-attitude"><path d="M35 37h112l-15 12H46Z" fill="#789787"/><path d="M86 37V25h28v12" fill="#b6c8b2"/><g transform="translate(32 36)"><g id="motor-attitude"><path d="M-8-10h9v12h-6v19h-8v-5h6Z" fill="#3a5e53"/><path d="M-16 22h14" stroke="#c19452" stroke-width="3"/></g></g></g></svg><strong id="bow-pitch">0.0°</strong><small id="bow-height">+0.00 m</small><small id="flight-state">Wypornościowo</small></div><p id="fuel-status"></p>`;
 for(let i=0;i<2;i++){
  $('#ignition-'+i).innerHTML=`<div class="ignition"><span class="key-positions">0 · I · START</span><div class="key-row"><button data-key-turn="-1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w lewo">↶</button><button id="key-${i}" class="key-knob" data-engine="${i}" aria-label="Stacyjka silnika ${i+1}: lewa połowa wyłącza, prawa uruchamia"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="24"/><g class="key-pointer"><path d="M23 12h8v29h-8Z"/><circle cx="27" cy="14" r="3"/></g></svg></button><button data-key-turn="1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w prawo">↷</button></div><small id="key-state-${i}" class="key-state">Wyłączony</small><small id="temperature-${i}" class="engine-temperature">18°C</small></div>`;
 }
 function turnKey(index,direction){const b=api.boat(),en=b.engines[index];if(!en)return;const action=direction>0?(en.key==='off'?'ignition':'start'):'off';api.toast(engineKey(b,index,action).message);}
 document.querySelectorAll('[data-key-turn]').forEach(btn=>btn.onclick=()=>turnKey(+btn.dataset.engine,+btn.dataset.keyTurn));
 document.querySelectorAll('.key-knob').forEach(btn=>{btn.onclick=e=>{const r=btn.getBoundingClientRect();turnKey(+btn.dataset.engine,e.clientX<r.left+r.width/2?-1:1);};btn.onkeydown=e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();e.stopPropagation();turnKey(+btn.dataset.engine,e.key==='ArrowRight'?1:-1);}};});
 document.querySelectorAll('[data-gas]').forEach(btn=>btn.onclick=()=>{const dir=+btn.dataset.gas;if(!dir){api.neutral();return;}const b=api.boat(),i=api.selected();api.setThrottle(throttleStep(i?b.throttle2:b.throttle,dir),i);});
 document.querySelectorAll('[data-trim]').forEach(btn=>btn.onclick=()=>{const b=api.boat(),target=Math.max(0,Math.min(1,b.engines[0].trimTarget+.05*+btn.dataset.trim));for(const en of b.engines)en.trimTarget=target;});
 const holds={bow:0,stern:0};api.holds=holds;
 for(const btn of document.querySelectorAll('[data-thruster]')){
  btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);holds[btn.dataset.thruster]=+btn.dataset.force;};
  btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>holds[btn.dataset.thruster]=0;
 }
 const release=()=>holds.bow=holds.stern=0;window.addEventListener('blur',release);document.addEventListener('visibilitychange',release);
 $('#refuel').onclick=()=>api.toast(requestRefuel(api.boat()).message);
 $('#sonar-toggle').onchange=e=>$('.sonar').hidden=!e.target.checked;
 return function update(){
  const b=api.boat(),S=b.spec,en=b.engines,avg=k=>en.reduce((sum,e)=>sum+e[k],0)/en.length;
  const trim=avg('trim'),temperature=Math.max(...en.map(e=>e.temperature));
  $('#gauge-rpm2').hidden=en.length!==2;$('#instruments').classList.toggle('twins',en.length===2);$('#gauge-rpm>span').textContent=en.length===2?'OBROTY · LEWY':'OBROTOMIERZ';
  const values={rpm:en[0].rpm,rpm2:en[1]?.rpm??0,speed:Math.hypot(b.vx,b.vy)*1.94384,fuel:100*b.fuel.litres/b.fuel.capacity,trim:100*trim,volt:b.battery.voltage,temp:temperature};
  for(const [id,value]of Object.entries(values)){const el=$('#gauge-'+id),fraction=Math.max(0,Math.min(1,(value-+el.dataset.min)/(+el.dataset.max-+el.dataset.min)));el.querySelector('.needle').style.transform=`rotate(${fraction*180}deg)`;el.querySelector('strong').textContent=value.toFixed(['rpm','rpm2','fuel','trim','temp'].includes(id)?0:1);}
  $('#gauge-fuel strong').textContent=b.fuel.litres.toFixed(1)+' l';$('#gauge-fuel small').textContent=b.fuel.flow.toFixed(1)+' L/h';
  $('#gauge-temp').classList.toggle('danger',temperature>=105);$('#gauge-trim').classList.toggle('disabled',!!S.jet);$('#trim-value').textContent=Math.round(trim*100)+'%';
  $('#bow-pitch').textContent=(b.pitch*180/Math.PI).toFixed(1)+'°';$('#bow-attitude').style.transform=`rotate(${-b.pitch*180/Math.PI}deg)`;$('#motor-attitude').style.transform=`rotate(${S.jet?0:trim*65-6}deg)`;
  const height=b.heave+S.length*.45*Math.sin(b.pitch);$('#bow-height').textContent=(height>=0?'+':'')+height.toFixed(2)+' m';$('#flight-state').textContent=b.planing>.65?'Ślizg':b.planing>.12?'Przejście do ślizgu':'Wypornościowo';
  $('#fuel-status').textContent=`${b.fuel.litres.toFixed(1)} / ${b.fuel.capacity} l · ${b.fuel.flow.toFixed(1)} L/h${b.fuel.refueling?' · TANKOWANIE':''}`;
  $('#refuel').textContent=b.fuel.refueling?'■ Stop tankowania':'⛽ Tankuj';
  const warnings=[];
  if(en.some(e=>e.overheated||e.thermalTrip))warnings.push('PRZEGRZANIE · zmniejsz gaz i opuść napęd'+(en.some(e=>e.thermalTrip)?' · silnik zatrzymany':''));
  else if(en.some(e=>e.key==='running'&&e.cooling<.25))warnings.push('Brak chłodzenia — opuść napęd');
  if(en.some(e=>e.ventilation>.15))warnings.push('Napowietrzona struga — zmniejsz trym');if(b.fuel.litres<b.fuel.capacity*.1)warnings.push('Rezerwa paliwa');if(b.battery.voltage<11.5)warnings.push('Niskie napięcie');if(b.reeds>.2)warnings.push('Szuwary · większy opór');
  $('#engine-warning').hidden=!warnings.length;$('#engine-warning').textContent=warnings.join(' · ');$('#engine-warning').classList.toggle('critical',en.some(e=>e.overheated||e.thermalTrip));
  for(const [i,e]of en.entries()){
   $('#key-state-'+i).textContent=({off:'Wyłączony',ignition:'Zapłon',starting:'Rozrusznik…',running:'Pracuje'})[e.key];$('#key-'+i+' .key-pointer').style.transform=`rotate(${e.key==='off'?-48:e.key==='starting'?48:0}deg)`;$('#key-'+i).classList.toggle('running',e.key==='running');$('#temperature-'+i).textContent=Math.round(e.temperature)+'°C';$('#temperature-'+i).classList.toggle('danger',e.overheated);
  }
  $('#raise-engines').disabled=!!S.jet;document.querySelectorAll('[data-trim]').forEach(btn=>btn.disabled=!!S.jet);
  $('#thruster-panel').hidden=!S.bowThruster&&!S.sternThruster;for(const end of ['bow','stern'])$('#thruster-'+end).hidden=!S[end+'Thruster'];
 };
}
