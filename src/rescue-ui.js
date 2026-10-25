import {RESCUE_TYPES,pickupStatus} from './rescue.js';
import {selectedRescue,rescueApproach} from './rescue-metrics.js';
import {throwRandomRescue,recoverRescue,scheduleRescue} from './rescue-scene.js';
const force=v=>v>=1000?(v/1000).toFixed(2)+' kN':Math.round(v)+' N';
const engines=r=>r.engines.map((e,i)=>`${r.engines.length===2?(i?'P':'L')+': ':''}${e.gear===0?'N':e.gear>0?'F':'R'} / ${{off:'wyłączony',ignition:'zapłon',starting:'rozruch',running:'pracuje'}[e.key]}`).join(' · ');
export function installRescueUI({fleet,boat,vehicle,toast,save,focus}){
 const panel=document.createElement('section');panel.className='rescue-panel map-popup';panel.id='rescue-panel';panel.hidden=true;panel.innerHTML=`<strong>Ćwiczenie SAR / MOB</strong><button id="rescue-close" class="popup-close" aria-label="Zamknij SAR">×</button><div class="rescue-controls"><select id="rescue-kind" aria-label="Obiekt ratunkowy">${Object.entries(RESCUE_TYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select><button id="rescue-throw" class="secondary">Wyrzuć teraz</button><button id="rescue-schedule" class="secondary">Losowy alarm w czasie rejsu</button><select id="rescue-target" aria-label="Obiekt do podjęcia"><option value="">Brak obiektów</option></select><button id="rescue-focus" class="secondary">Pokaż</button><button id="rescue-pickup" class="secondary">Podejmij</button><output id="rescue-status" aria-live="polite"></output><output id="rescue-attempt" hidden></output><output id="rescue-result" hidden></output></div>`;
 document.querySelector('.water-wrap').append(panel);const open=document.createElement('button');open.id='sar-open';open.textContent='◎ SAR';document.querySelector('#fleet-open').after(open);
 const guide=document.createElement('section');guide.id='rescue-map';guide.hidden=true;guide.setAttribute('aria-label','Podejście SAR');guide.innerHTML='<div class="rescue-map-heading"><strong id="rescue-map-name"></strong><button id="rescue-dismiss" aria-label="Zamknij wynik SAR">×</button></div><div class="rescue-map-readings"><span>Od burty <b id="rescue-distance"></b></span><span>Zbliżanie <b id="rescue-closing"></b></span><span>Wzgl. obiektu <b id="rescue-relative"></b></span><span>Kontakt max · szac. <b id="rescue-contact"></b></span></div><small id="rescue-map-state"></small><button id="rescue-map-pickup" class="primary">Podejmij</button>';
 document.querySelector('.water-wrap').append(guide);
 const $=id=>document.getElementById(id);let signature='',dismissedResult=null;
 $('rescue-throw').onclick=()=>{const r=throwRandomRescue(fleet(),boat(),$('rescue-kind').value);toast(r.message);if(r.ok){panel.hidden=true;refresh();save();}};
 open.onclick=()=>{panel.hidden=!panel.hidden;refresh();};$('rescue-close').onclick=()=>{panel.hidden=true;refresh();};
 $('rescue-schedule').onclick=()=>{const f=fleet();if(f.rescue.pending){f.rescue.pending=null;toast('Losowy alarm anulowany.');}else{scheduleRescue(f,boat(),$('rescue-kind').value);toast('Losowy alarm SAR uzbrojony · 30–180 s aktywnego rejsu.');panel.hidden=true;}refresh();save();};
 function pickup(){const o=selectedRescue(fleet()),r=recoverRescue(fleet(),boat(),o?.id);toast(r.message);if(r.ok||r.attempted)save();refresh();}
 $('rescue-pickup').onclick=$('rescue-map-pickup').onclick=pickup;
 $('rescue-target').onchange=()=>{fleet().rescue.targetId=$('rescue-target').value;refresh();save();};
 $('rescue-focus').onclick=()=>{const o=selectedRescue(fleet());if(o)focus(o);};
 $('rescue-dismiss').onclick=()=>{dismissedResult=fleet().rescue.lastResult;refresh();};
 function refresh(){
  const isBoat=vehicle()==='boat';if(!isBoat)panel.hidden=true;open.disabled=!isBoat;open.setAttribute('aria-pressed',String(!panel.hidden));const state=fleet().rescue,objects=state?.objects.filter(o=>!o.recovered)??[],next=objects.map(o=>o.id).join(',');
  if(signature!==next){signature=next;$('rescue-target').replaceChildren(...objects.map(o=>new Option(RESCUE_TYPES[o.kind].name+' · '+o.id.slice(7),o.id)));}
  const o=selectedRescue(fleet()),status=pickupStatus(boat(),o),result=state?.lastResult,attempt=state?.lastAttempt,recent=attempt&&!attempt.success&&(!o||attempt.objectId===o.id)&&fleet().time-attempt.time<8;
  $('rescue-attempt').hidden=!attempt;if(attempt)$('rescue-attempt').textContent=(attempt.success?'Udana':'Nieudana')+' próba · '+attempt.reason+' · '+(attempt.relativeSpeed*3.6).toFixed(2)+' km/h';
  if(o)$('rescue-target').value=o.id;
  for(const id of['rescue-pickup','rescue-map-pickup'])$(id).textContent=status.chance<1?'Spróbuj podjąć':'Podejmij';
  $('rescue-pickup').disabled=$('rescue-map-pickup').disabled=!status.canAttempt;$('rescue-focus').disabled=!o;
  $('rescue-status').textContent=o?`${Math.hypot(o.x-boat().x,o.y-boat().y).toFixed(1)} m · ${Math.round(fleet().time-o.thrownAt)} s · ${status.message}`:`Podjęte: ${state?.recovered??0} · kontakty kadłubem: ${state?.contacts??0}`;
  $('rescue-result').hidden=!result;if(result)$('rescue-result').textContent=`Wynik SAR ${result.score}/100 · ${result.elapsed.toFixed(1)} s · podjęcie ${(result.pickupSpeed*3.6).toFixed(2)} km/h · kontakt max (szac.) ${force(result.peakForce)} · ${result.contacts} kontaktów · silniki ${engines(result)}${result.contactInGear?' · kontakt przy biegu F/R':''}`;
  $('rescue-schedule').textContent=state?.pending?'Anuluj losowy alarm':'Losowy alarm w czasie rejsu';
  guide.hidden=!isBoat||!panel.hidden||(!o&&(!result||dismissedResult===result));if(guide.hidden)return;
  const reading=o?rescueApproach(boat(),o):null;
  $('rescue-map-name').textContent=o?'SAR · '+RESCUE_TYPES[o.kind].name:'SAR · wynik '+result.score+'/100';
  $('rescue-distance').textContent=o?reading.distance.toFixed(1)+' m':'Podjęto';
  const closing=o?reading.closingSpeed:result.closingSpeed;
  $('rescue-closing').textContent=(closing>=0?'+':'')+(closing*3.6).toFixed(2)+' km/h';
  $('rescue-relative').textContent=((o?reading.relativeSpeed:result.pickupSpeed)*3.6).toFixed(2)+' km/h';
  $('rescue-contact').textContent=force(o?(o.contactMetrics?.[boat().id]?.peakForce??0):result.peakForce);
  $('rescue-map-state').textContent=o?(recent?'Nieudana próba: '+attempt.reason+' · '+status.message:status.message):engines(result);
  $('rescue-map-pickup').hidden=!o;$('rescue-dismiss').hidden=!!o;
 }
 refresh();return refresh;
}
