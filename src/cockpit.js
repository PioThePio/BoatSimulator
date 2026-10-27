import {engineRPMRange} from './combustion.js';
import {pumpMode,setPumpMode} from './bilge.js';
import {throttleStep} from './controls.js';
import {engineKey} from './craft.js';
import {trimStep} from './drive.js';
import {gauge,attitudeMarkup,updateAttitude} from './instruments.js';
import {requestRefuel} from './systems.js';
import {thermalStage,coolingWarning} from './thermal.js';
import {requestRepair} from './service.js';
import {conditionMarkup,updateContactInstrument} from './contact-instrument.js';
import {setGaugeNeedle} from './gauge-motion.js';
import {alarmStatus,acknowledgeAlarms} from './alarms.js';
const $=s=>document.querySelector(s);
function updateIgnitionView(b,index){const e=b.engines[index];$('#key-state-'+index).textContent=({off:'Wyłączony',ignition:'Zapłon',starting:'Rozrusznik…',running:'Pracuje'})[e.key];$('#key-'+index+' .key-pointer').style.transform=`rotate(${e.key==='off'?-48:e.key==='starting'||e.keyStartUntil>b.time?48:0}deg)`;$('#key-'+index).classList.toggle('running',e.key==='running');}
export function installCockpit(api){
 const lamp=document.createElement('button');lamp.type='button';lamp.id='alarm-ack';lamp.className='alarm-lamp';lamp.innerHTML='<i aria-hidden="true"></i>';lamp.setAttribute('aria-label','Potwierdź alarm dźwiękowy');lamp.title='Lampka alarmu · naciśnij, aby uciszyć bieżący alarm';$('.throttle-section>.hint').before(lamp);lamp.onclick=()=>{acknowledgeAlarms(api.boat());updateAlarmLamp(api.boat());};
 $('#instruments').innerHTML=gauge('rpm','OBROTOMIERZ',0,6500,'obr/min')+gauge('rpm2','OBROTY · PRAWY',0,6500,'obr/min')+gauge('speed','PRĘDKOŚĆ',0,120,'km/h')+gauge('fuel','PALIWO',0,100,'L/h')+gauge('trim','TRYM',0,100,'%')+gauge('volt','BAT',8,16,'V')+gauge('temp','Temp',20,140,'°C')+attitudeMarkup();
 $('.pitch-gauge').insertAdjacentHTML('beforeend',conditionMarkup());$('#instruments').insertAdjacentHTML('beforeend','<div class="bilge-panel"><div><span>WODA W ZĘZIE</span><strong id="bilge-level">0%</strong><span id="bilge-inflow">↘ 0,0 l/min</span><span id="bilge-litres">0 l</span><span id="bilge-outflow">↗ 0,0 l/min</span></div><meter id="bilge-meter" min="0" max="100" high="50" optimum="0" value="0" aria-label="Poziom wody w zęzie"></meter><button id="bilge-pump" title="Ręczne włączenie pompy; AUTO działa niezależnie" aria-pressed="false">POMPA OFF</button><label hidden><input id="bilge-auto" type="checkbox" checked> AUTO</label></div>');$('#bilge-pump').onclick=()=>{const q=api.boat().bilge;setPumpMode(q,({off:'auto',auto:'on',on:'off'})[pumpMode(q)]);updateBilgePanel(api.boat());};$('#bilge-auto').onchange=e=>api.boat().bilge.auto=e.target.checked;
 for(let i=0;i<2;i++){
  $('#ignition-'+i).innerHTML=`<div class="ignition"><span class="key-positions">0 · I · START</span><div class="key-row"><button data-key-turn="-1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w lewo">↶</button><button id="key-${i}" class="key-knob" data-engine="${i}" aria-label="Stacyjka silnika ${i+1}: lewa połowa wyłącza, prawa uruchamia"><svg viewBox="0 0 54 54" aria-hidden="true"><circle cx="27" cy="27" r="24"/><g class="key-pointer"><path d="M23 12h8v29h-8Z"/><circle cx="27" cy="14" r="3"/></g></svg></button><button data-key-turn="1" data-engine="${i}" aria-label="Silnik ${i+1}: przekręć stacyjkę w prawo">↷</button></div><small id="key-state-${i}" class="key-state">Wyłączony</small><small id="temperature-${i}" class="engine-temperature">18°C</small></div>`;
 }
 function turnKey(index,direction){const b=api.boat(),en=b.engines[index];if(!en)return;const action=direction>0?(en.key==='off'?'ignition':'start'):'off';api.toast(engineKey(b,index,action).message);updateIgnitionView(b,index);}
 document.querySelectorAll('[data-key-turn]').forEach(btn=>btn.onclick=()=>turnKey(+btn.dataset.engine,+btn.dataset.keyTurn));
 document.querySelectorAll('.key-knob').forEach(btn=>{btn.onclick=e=>{const r=btn.getBoundingClientRect();turnKey(+btn.dataset.engine,e.detail!==0&&e.clientX<r.left+r.width*.45?-1:1);};});
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
 $('#sonar-toggle').onchange=e=>{api.boat().electrics.sonar=e.target.checked;$('.sonar').hidden=!e.target.checked;};
 return function update(){
  const b=api.boat(),S=b.spec,en=b.engines,avg=k=>en.reduce((sum,e)=>sum+e[k],0)/en.length;
  document.body.dataset.passive=String(!!S.passive);
  for(const id of ['rpm','rpm2']){const el=$('#gauge-'+id),max=engineRPMRange(api.vehicle?.()==='suv'?{}:S).max;if(+el.dataset.max!==max){el.dataset.max=max;el.querySelector('.gauge-dial>text:nth-of-type(2)').textContent=(max/1000).toFixed(1);}}
  const speedMax=api.vehicle?.()!=='suv'&&S.racing?200:120;if(+$('#gauge-speed').dataset.max!==speedMax){$('#gauge-speed').dataset.max=speedMax;$('#gauge-speed .gauge-dial>text:nth-of-type(2)').textContent=speedMax;}
  const noTrim=S.passive||S.air||S.jet||S.propulsion==='inboard',trim=b.enginesRaised?1:avg('trim'),temperature=Math.max(...en.map(e=>e.temperature));
  $('#first-engine h3').textContent=en.length===2?'Lewy':'Solo';$('#gauge-rpm2').hidden=en.length!==2;$('#instruments').classList.toggle('twins',en.length===2);$('#gauge-rpm .gauge-name').textContent=en.length===2?'RPM L':'RPM';$('#gauge-rpm .gauge-face-title').textContent=en.length===2?'RPM L':'RPM';
  const values={rpm:en[0].rpm,rpm2:en[1]?.rpm??0,speed:Math.hypot(b.vx,b.vy)*3.6,fuel:b.fuel.capacity?100*b.fuel.litres/b.fuel.capacity:0,trim:100*trim,volt:b.battery.voltage,temp:temperature};
  const car=api.vehicle?.()==='suv',masterLive=car||b.electrics.master!==false,instrumentsLive=car||b.electrics.powered.instruments;
  for(const [id,value]of Object.entries(values)){const el=$('#gauge-'+id),live=id==='volt'?masterLive:instrumentsLive,fraction=live?Math.max(0,Math.min(1,(value-+el.dataset.min)/(+el.dataset.max-+el.dataset.min))):0;setGaugeNeedle(el,fraction,!!live);el.querySelector('strong').textContent=live?value.toFixed(['rpm','rpm2','fuel','trim','temp'].includes(id)?0:1):'—';}
  for(const id of ['rpm','rpm2'])$('#gauge-'+id+' small').textContent='';
  $('#gauge-fuel strong').textContent=instrumentsLive?b.fuel.litres.toFixed(1)+' l':'—';$('#gauge-fuel small').textContent='';$('#fuel-flow-dial').textContent=instrumentsLive?b.fuel.flow.toFixed(1)+' L/h':'— L/h';$('#fuel-flow-dial').setAttribute('aria-label','Spalanie w litrach na godzinę');$('#battery-soc-face').textContent=masterLive?'SOC '+(b.battery.soc*100).toFixed(1)+'%':'SOC —';
  $('#gauge-temp').dataset.temperatureStage=thermalStage(temperature);$('#gauge-temp').classList.toggle('danger',temperature>=105);$('#gauge-trim').classList.toggle('disabled',!!noTrim);$('#trim-value').textContent=Math.round((b.enginesRaised?1:en[0].trimTarget)*100)+'%';$('#trim-value').title=(en[0].trimTarget<=.4?'Roboczy trym':'Podnoszenie napędu')+' · pozycja zadana';$('#gauge-trim small').textContent=S.air?'ŚMIGŁO POWIETRZNE':S.propulsion==='inboard'?'STAŁY WAŁ':S.jet?'NAPĘD STRUGOWY':'%';
  updateAttitude(b,api.env);
  updateContactInstrument(b);
  const reserve=b.fuel.litres<b.fuel.capacity*.1,hot=temperature>=105,lowVolt=b.battery.voltage<11.5,highVolt=b.battery.voltage>14.8;
  for(const [id,active,label]of [['fuel',reserve,reserve?'Rezerwa paliwa':'Paliwo powyżej rezerwy'],['temp',temperature>=95,({high:'HIGH TEMP',alarm:'ALARM TEMPERATURY',overheat:'OVERHEAT'})[thermalStage(temperature)]??'Temperatura prawidłowa'],['volt',lowVolt||highVolt,lowVolt?'Niskie napięcie':highVolt?'Za wysokie napięcie':'Napięcie prawidłowe']]){const led=$('#'+id+'-led');led.classList.toggle('lit',active);led.setAttribute('aria-label',label);led.title=label;}
  $('#gauge-volt').classList.toggle('danger',lowVolt||highVolt);$('#gauge-volt small').textContent='V';$('#gauge-volt').title=(lowVolt?'NISKIE':highVolt?'WYSOKIE':b.battery.current<0?'ŁADOWANIE':b.battery.loadCurrent>.1?'POBÓR':'SPOCZYNEK');
  $('#fuel-status').textContent=`${b.fuel.litres.toFixed(1)} / ${b.fuel.capacity} l · ${b.fuel.flow.toFixed(1)} L/h${b.fuel.refueling?' · TANKOWANIE':b.fuel.status?' · '+b.fuel.status:''}`;
  $('#refuel').textContent=b.fuel.refueling?'■ Stop tankowania':'⛽ Tankuj';
  $('#repair').textContent=b.service.active?'■ Przerwij naprawę':b.towRig?.boatLoaded?'🔧 Napraw na stanowisku':'🔧 Napraw przy slipie';$('#repair-status').textContent=b.service.status+(b.service.active?' · '+Math.round(b.service.progress*100)+'%':'');
  const q=b.bilge;updateBilgePanel(b);updateAlarmLamp(b);const warnings=[];if(b.electrics.floodFault)warnings.push('ZWARCIE · instalacja zalana · brak zasilania');if(b.sunken)warnings.push('ŁÓDŹ ZATOPIONA');else if(b.swamped)warnings.push('Zalany pokład · pompuj i wracaj do serwisu');if(q.alarm)warnings.push('UWAGA — WODA W ZĘZIE');
  const stage=thermalStage(temperature);
  if(stage!=='normal'||en.some(e=>e.thermalTrip))warnings.push(({high:'HIGH TEMP',alarm:'ALARM TEMPERATURY',overheat:'OVERHEAT'})[stage]+' · zmniejsz gaz i sprawdź chłodzenie'+(en.some(e=>e.thermalTrip)?' · silnik zatrzymany':''));
  else{const cooling=coolingWarning(b);if(cooling)warnings.push(cooling);}
  if(en.some(e=>e.key==='running'&&e.ventilation>.15))warnings.push(S.jet?'Zapowietrzony wlot — zmniejsz gaz i zanurz wlot':'Napowietrzona struga — zmniejsz trym');if(b.fuel.litres<b.fuel.capacity*.1)warnings.push('Rezerwa paliwa');if(b.battery.voltage<11.5)warnings.push('Niskie napięcie');if(en.some(e=>e.startFailure))warnings.push('Rozruch nieudany · słaby akumulator, wyłącz odbiorniki i doładuj');if(b.reeds>.2)warnings.push('Szuwary · większy opór');
  $('#engine-warning').hidden=!warnings.length;$('#engine-warning').textContent=warnings.join(' · ');$('#engine-warning').classList.toggle('critical',b.sunken||q.alarm||en.some(e=>e.overheated||e.thermalTrip));
  for(const [i,e]of en.entries()){
   updateIgnitionView(b,i);$('#temperature-'+i).textContent=Math.round(e.temperature)+'°C'+({high:' · HIGH TEMP',alarm:' · ALARM',overheat:' · OVERHEAT'}[thermalStage(e.temperature)]??'');$('#temperature-'+i).classList.toggle('danger',e.overheated);
  }
  document.querySelectorAll('[data-trim]').forEach(btn=>btn.disabled=!!noTrim);
  $('#thruster-panel').hidden=!S.bowThruster&&!S.sternThruster;for(const end of ['bow','stern'])$('#thruster-'+end).hidden=!S[end+'Thruster'];
 };
}

export function updateBilgePanel(b){
 const q=b.bilge;
 $('#bilge-level').textContent=Math.round(q.level*100)+'%';$('#bilge-meter').value=q.level*100;
 $('#bilge-litres').textContent=Math.round(q.litres)+' l';
 $('#bilge-inflow').textContent='↘ '+(q.inflow*60).toFixed(1)+' l/min';$('#bilge-inflow').title='Napływ wody';
 $('#bilge-outflow').textContent='↗ '+((q.outflow+(b.service?.pumpOutflow??0))*60).toFixed(1)+' l/min';$('#bilge-outflow').title='Wypompowywanie · pompa '+q.pumpRate+' l/min przy 12 V'+(b.service?.pumpOutflow?' + pompa serwisowa':'');
 const live=b.electrics?.master!==false,mode=pumpMode(q),on=live&&q.running;
 if($('#bilge-pump').dataset.mode!==mode)$('#bilge-pump').innerHTML='<span class="rocker-face pump-face" aria-hidden="true"><i class="pump-auto-led"></i><i class="pump-on-led"></i></span><span class="rocker-caption">POMPA '+mode.toUpperCase()+'</span>';
 $('#bilge-pump .pump-auto-led').classList.toggle('lit',live&&mode==='auto');$('#bilge-pump .pump-on-led').classList.toggle('lit',!!on);
 $('#bilge-pump').setAttribute('aria-pressed',String(on));$('#bilge-pump').setAttribute('aria-label','Pompa '+mode.toUpperCase()+'. Kliknij: OFF, AUTO, ON.');
 $('#bilge-pump').dataset.mode=mode;$('#bilge-auto').checked=q.auto;
 $('#bilge-pump').title=`OFF → AUTO → ON. Pływak: ${q.autoOnLitres.toFixed(0)} / ${q.autoOffLitres.toFixed(0)} l. Diody: AUTO i rzeczywista praca pompy.`;
 $('.bilge-panel').classList.toggle('danger',q.alarm);
}
function updateAlarmLamp(b){
 const lamp=$('#alarm-ack'),s=alarmStatus(b);lamp.dataset.state=!s.lit?'off':s.critical?'critical':'ignition';lamp.dataset.muted=String(s.muted);lamp.setAttribute('aria-pressed',String(s.muted));
 const message=!s.lit?'Brak aktywnego alarmu':s.critical?'Alarm awarii / wody w zęzie':'Zapłon · silnik nie pracuje';lamp.setAttribute('aria-label',message+(s.muted?' · dźwięk potwierdzony':' · naciśnij, aby uciszyć'));lamp.title=message+(s.muted?' · dźwięk uciszony do następnego alarmu lub cyklu zasilania':' · kliknij, aby uciszyć dźwięk');
}
