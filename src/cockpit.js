import {throttleStep} from './controls.js';
import {engineKey} from './craft.js';
import {requestRefuel} from './systems.js';
const $=s=>document.querySelector(s);
function gauge(id,title,min,max,unit){return `<div class="gauge" id="gauge-${id}" data-min="${min}" data-max="${max}"><svg viewBox="0 0 120 76" aria-hidden="true"><path d="M14 61a46 46 0 0 1 92 0" class="gauge-arc"/><path d="M60 61h-39" class="needle"/><circle cx="60" cy="61" r="3"/></svg><span>${title}</span><strong>0</strong><small>${unit}</small></div>`;}
export function installCockpit(api){
 const throttle=$('.throttle-section');
 throttle.querySelector('.eyebrow').textContent='NAPĘD · ROZRUCH NA LUZIE';
 const first=document.createElement('div');first.className='engine-card';first.id='first-engine';
 first.append(throttle.querySelector(':scope>.section-heading'),throttle.querySelector(':scope>.throttle-row'));throttle.insertBefore(first,$('#second-engine'));
 $('#second-engine').classList.add('engine-card');
 $('.engine-select').hidden=true;
 for(let i=0;i<2;i++){
  const el=i?$('#second-engine'):first;
  el.insertAdjacentHTML('beforeend',`<div class="lever-steps"><button data-gas="1" aria-label="Silnik ${i+1}: krok naprzód">▲</button><button data-gas="0" aria-label="Silnik ${i+1}: luz">N</button><button data-gas="-1" aria-label="Silnik ${i+1}: krok wstecz">▼</button></div><div class="trim-buttons"><span>TRYM</span><button data-trim="1" aria-label="Silnik ${i+1}: trym w górę">＋</button><button data-trim="-1" aria-label="Silnik ${i+1}: trym w dół">−</button><output id="trim-${i}">28%</output></div><div class="keys"><button data-key="off" title="Wyłącz silnik i zapłon">0</button><button data-key="ignition" title="Włącz zapłon">Zapłon</button><button data-key="start" title="Uruchom silnik na luzie">Start</button></div><small id="key-state-${i}" class="key-state">Wyłączony</small>`);
  el.querySelectorAll('[data-gas]').forEach(btn=>btn.onclick=()=>{const b=api.boat(),v=i?b.throttle2:b.throttle;api.setThrottle(+btn.dataset.gas?throttleStep(v,+btn.dataset.gas):0,i);});
  el.querySelectorAll('[data-key]').forEach(btn=>btn.onclick=()=>api.toast(engineKey(api.boat(),i,btn.dataset.key).message));
  el.querySelectorAll('[data-trim]').forEach(btn=>btn.onclick=()=>{const b=api.boat();for(const [j,en] of b.engines.entries())if(j===i||b.linked)en.trimTarget=Math.max(0,Math.min(1,en.trimTarget+.05*+btn.dataset.trim));});
 }
 throttle.append(first,$('#second-engine'),$('.engine-link-controls'),$('#neutral'),throttle.querySelector(':scope>.hint'),$('#engine-state'));
 $('.wheel-description p').innerHTML='4 obroty od oporu do oporu.<br>Koło pozostaje w ustawieniu.';
 $('.controls').insertAdjacentHTML('beforeend',`<div class="instruments">${gauge('rpm','OBROTOMIERZ',0,6500,'obr/min')}${gauge('speed','PRĘDKOŚĆ',0,60,'kn')}${gauge('fuel','PALIWO',0,100,'%')}${gauge('trim','TRYM',0,100,'%')}${gauge('volt','AKUMULATOR',8,16,'V')}<div class="pitch-gauge"><span>UNIESIENIE DZIOBU</span><svg viewBox="0 0 160 50"><path d="M5 39h150" stroke="#86a79a" stroke-dasharray="4 3"/><g id="bow-attitude"><path d="M22 30h112l-15 9H35Z" fill="#789787"/><path d="M76 30v-9h28v9" fill="#b6c8b2"/></g></svg><strong id="bow-pitch">0.0°</strong><small id="bow-height">+0.00 m względem spoczynku</small><small id="flight-state">Wypornościowo</small></div><div id="engine-warning" role="status" hidden></div><p id="fuel-status"></p><button id="refuel" class="secondary">⛽ Tankuj przy pomoście</button></div><div id="thruster-panel"><h2>Stery strumieniowe <small>działają na zapłonie</small></h2><div>${['bow','stern'].map((end,i)=>`<div id="thruster-${end}"><span>${i?'Rufa · Z / X':'Dziób · Q / E'}</span><button data-thruster="${end}" data-force="-1" aria-label="${i?'Rufa':'Dziób'} w lewo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button data-thruster="${end}" data-force="1" aria-label="${i?'Rufa':'Dziób'} w prawo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div>`).join('')}</div><p class="hint">Przytrzymaj przycisk. Strumień słabnie z prędkością; zużywa energię akumulatora.</p></div>`);
 $('.wheel-section').append($('#thruster-panel'));
 const holds={bow:0,stern:0};api.holds=holds;
 for(const btn of document.querySelectorAll('[data-thruster]')){
  btn.onpointerdown=e=>{e.preventDefault();btn.setPointerCapture(e.pointerId);holds[btn.dataset.thruster]=+btn.dataset.force;};
  btn.onpointerup=btn.onpointercancel=btn.onlostpointercapture=()=>holds[btn.dataset.thruster]=0;
 }
 window.addEventListener('blur',()=>holds.bow=holds.stern=0);document.addEventListener('visibilitychange',()=>holds.bow=holds.stern=0);
 $('.vessel .number-grid').insertAdjacentHTML('beforeend',`<label>Paliwo · łącznie [l]<input id="fuel-capacity" type="number" min="10" max="800" step="5" value="100"></label><label>Zbiorniki<select id="tank-count"><option value="1">1 zbiornik</option><option value="2">2 zbiorniki</option></select></label>`);
 $('#apply-craft').insertAdjacentHTML('beforebegin',`<div class="thruster-options"><label><input id="bow-thruster" type="checkbox"> Strumieniowy dziobowy</label><label><input id="stern-thruster" type="checkbox"> Strumieniowy rufowy</label></div>`);
 for(const id of ['power-left','power-right'])$('#'+id).max=350;
 $('#power-left').value=$('#power-right').value=90;
 $('#boat-length').min='2.8';$('#boat-beam').min='1.1';$('#boat-beam').step='.01';$('#boat-mass').min='200';
 $('.vessel .value-tag').textContent='v4';
 $('.map-toolbar>div').insertAdjacentHTML('afterbegin','<button id="trail-toggle" aria-pressed="true">〰 Ślad: wł.</button>');
 api.showTrail=true;$('#trail-toggle').onclick=()=>{api.showTrail=!api.showTrail;$('#trail-toggle').setAttribute('aria-pressed',api.showTrail);$('#trail-toggle').textContent='〰 Ślad: '+(api.showTrail?'wł.':'wył.');};
 $('#preset').insertAdjacentHTML('afterend','<label class="switch-line"><span>Lokalny wiatr, prąd i osłona fali</span><input id="spatial-effects" type="checkbox" checked role="switch"><span class="switch"></span></label><label class="switch-line"><span>Zacumowane łodzie w porcie</span><input id="traffic" type="checkbox" checked role="switch"><span class="switch"></span></label>');
 $('#spatial-effects').onchange=e=>api.env.spatialEffects=e.target.checked;$('#traffic').onchange=e=>api.env.traffic=e.target.checked;
 $('#refuel').onclick=()=>api.toast(requestRefuel(api.boat()).message);
 return function update(){
  const b=api.boat(),S=b.spec,en=b.engines,avg=k=>en.reduce((sum,e)=>sum+e[k],0)/en.length;
  const values={rpm:avg('rpm'),speed:Math.hypot(b.vx,b.vy)*1.94384,fuel:100*b.fuel.litres/b.fuel.capacity,trim:100*avg('trim'),volt:b.battery.voltage};
  for(const [id,value]of Object.entries(values)){const el=$('#gauge-'+id),fraction=Math.max(0,Math.min(1,(value-+el.dataset.min)/(+el.dataset.max-+el.dataset.min)));el.querySelector('.needle').style.transform=`rotate(${fraction*180}deg)`;el.querySelector('strong').textContent=value.toFixed(id==='rpm'||id==='fuel'||id==='trim'?0:1);}
  $('#raise-engines').disabled=!!S.jet;
  $('#gauge-trim').classList.toggle('disabled',!!S.jet);
  $('#bow-pitch').textContent=(b.pitch*180/Math.PI).toFixed(1)+'°';$('#bow-attitude').style.transform=`rotate(${-b.pitch*180/Math.PI}deg)`;
  const height=b.heave+S.length*.45*Math.sin(b.pitch);$('#bow-height').textContent=(height>=0?'+':'')+height.toFixed(2)+' m względem spoczynku';
  $('#flight-state').textContent=b.planing>.65?'Ślizg':b.planing>.12?'Przejście do ślizgu':'Wypornościowo';
  $('#fuel-status').textContent=`${b.fuel.litres.toFixed(1)} / ${b.fuel.capacity} l · ${b.fuel.flow.toFixed(1)} l/h · ${b.fuel.tanks.length} zb. · ${Math.round(S.mass)} kg${b.fuel.refueling?' · TANKOWANIE':''}`;
  $('#refuel').textContent=b.fuel.refueling?'■ Zatrzymaj tankowanie':'⛽ Tankuj przy pomoście';
  const warnings=[];if(en.some(e=>e.ventilation>.15))warnings.push('⚠ Wentylacja śruby — zmniejsz trym');if(b.fuel.litres<b.fuel.capacity*.1)warnings.push('⚠ Rezerwa paliwa');if(b.battery.voltage<11.5)warnings.push('⚠ Niskie napięcie');if(b.reeds>.2)warnings.push('Szuwary · zwiększony opór');
  $('#engine-warning').hidden=!warnings.length;$('#engine-warning').textContent=warnings.join(' · ');
  for(const [i,e]of en.entries()){$('#trim-'+i).textContent=Math.round(100*e.trim)+'%';$('#key-state-'+i).textContent=({off:'Wyłączony',ignition:'Zapłon',starting:'Rozruch…',running:'Pracuje'})[e.key]+` · ${Math.round(e.rpm)} obr/min`;
   const card=i?$('#second-engine'):first;card.querySelectorAll('[data-key]').forEach(btn=>btn.classList.toggle('active',btn.dataset.key===e.key||(e.key==='running'&&btn.dataset.key==='start')));card.querySelectorAll('[data-trim]').forEach(btn=>btn.disabled=!!S.jet);
  }
  $('#thruster-panel').hidden=!S.bowThruster&&!S.sternThruster;for(const end of ['bow','stern'])$('#thruster-'+end).hidden=!S[end+'Thruster'];
 };
}
