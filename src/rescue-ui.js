import {RESCUE_TYPES,pickupStatus} from './rescue.js';
import {selectedRescue,rescueApproach} from './rescue-metrics.js';
import {throwRescue,recoverRescue} from './rescue-scene.js';
const force=v=>v>=1000?(v/1000).toFixed(2)+' kN':Math.round(v)+' N';
const engines=r=>r.engines.map((e,i)=>`${r.engines.length===2?(i?'P':'L')+': ':''}${e.gear===0?'N':e.gear>0?'F':'R'} / ${{off:'wyłączony',ignition:'zapłon',starting:'rozruch',running:'pracuje'}[e.key]}`).join(' · ');
export function installRescueUI({fleet,boat,vehicle,toast,save,focus}){
 const panel=document.createElement('details');panel.className='rescue-panel';panel.id='rescue-panel';panel.innerHTML=`<summary>◎ Ratownictwo · ćwiczenie SAR / MOB</summary><div class="rescue-controls"><select id="rescue-kind" aria-label="Obiekt ratunkowy">${Object.entries(RESCUE_TYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select><select id="rescue-side" aria-label="Burta rzutu"><option value="1">Prawa burta</option><option value="-1">Lewa burta</option></select><button id="rescue-throw" class="secondary">Wyrzuć</button><select id="rescue-target" aria-label="Obiekt do podjęcia"><option value="">Brak obiektów</option></select><button id="rescue-focus" class="secondary">Pokaż</button><button id="rescue-pickup" class="secondary">Podejmij</button><output id="rescue-status" aria-live="polite"></output><output id="rescue-result" hidden></output></div>`;
 document.querySelector('.controls').after(panel);
 const guide=document.createElement('section');guide.id='rescue-map';guide.hidden=true;guide.setAttribute('aria-label','Podejście SAR');guide.innerHTML='<div class="rescue-map-heading"><strong id="rescue-map-name"></strong><button id="rescue-dismiss" aria-label="Zamknij wynik SAR">×</button></div><div class="rescue-map-readings"><span>Od burty <b id="rescue-distance"></b></span><span>Zbliżanie <b id="rescue-closing"></b></span><span>Wzgl. obiektu <b id="rescue-relative"></b></span><span>Kontakt max · szac. <b id="rescue-contact"></b></span></div><small id="rescue-map-state"></small><button id="rescue-map-pickup" class="primary">Podejmij</button>';
 document.querySelector('.water-wrap').append(guide);
 const $=id=>document.getElementById(id);let signature='',dismissedResult=null;
 $('rescue-throw').onclick=()=>{const r=throwRescue(fleet(),boat(),$('rescue-kind').value,+$('rescue-side').value);toast(r.message);if(r.ok){refresh();save();}};
 function pickup(){const o=selectedRescue(fleet()),r=recoverRescue(fleet(),boat(),o?.id);toast(r.message);if(r.ok)save();refresh();}
 $('rescue-pickup').onclick=$('rescue-map-pickup').onclick=pickup;
 $('rescue-target').onchange=()=>{fleet().rescue.targetId=$('rescue-target').value;refresh();save();};
 $('rescue-focus').onclick=()=>{const o=selectedRescue(fleet());if(o)focus(o);};
 $('rescue-dismiss').onclick=()=>{dismissedResult=fleet().rescue.lastResult;refresh();};
 function refresh(){
  const isBoat=vehicle()==='boat';panel.hidden=!isBoat;const state=fleet().rescue,objects=state?.objects.filter(o=>!o.recovered)??[],next=objects.map(o=>o.id).join(',');
  if(signature!==next){signature=next;$('rescue-target').replaceChildren(...objects.map(o=>new Option(RESCUE_TYPES[o.kind].name+' · '+o.id.slice(7),o.id)));}
  const o=selectedRescue(fleet()),status=pickupStatus(boat(),o),result=state?.lastResult;
  if(o)$('rescue-target').value=o.id;
  $('rescue-pickup').disabled=$('rescue-map-pickup').disabled=!status.ok;$('rescue-focus').disabled=!o;
  $('rescue-status').textContent=o?`${Math.hypot(o.x-boat().x,o.y-boat().y).toFixed(1)} m · ${Math.round(fleet().time-o.thrownAt)} s · ${status.message}`:`Podjęte: ${state?.recovered??0} · kontakty kadłubem: ${state?.contacts??0}`;
  $('rescue-result').hidden=!result;if(result)$('rescue-result').textContent=`Wynik SAR ${result.score}/100 · ${result.elapsed.toFixed(1)} s · podjęcie ${(result.pickupSpeed*3.6).toFixed(2)} km/h · kontakt max (szac.) ${force(result.peakForce)} · ${result.contacts} kontaktów · silniki ${engines(result)}${result.contactInGear?' · kontakt przy biegu F/R':''}`;
  guide.hidden=!isBoat||(!o&&(!result||dismissedResult===result));if(guide.hidden)return;
  const reading=o?rescueApproach(boat(),o):null;
  $('rescue-map-name').textContent=o?'SAR · '+RESCUE_TYPES[o.kind].name:'SAR · wynik '+result.score+'/100';
  $('rescue-distance').textContent=o?reading.distance.toFixed(1)+' m':'Podjęto';
  const closing=o?reading.closingSpeed:result.closingSpeed;
  $('rescue-closing').textContent=(closing>=0?'+':'')+(closing*3.6).toFixed(2)+' km/h';
  $('rescue-relative').textContent=((o?reading.relativeSpeed:result.pickupSpeed)*3.6).toFixed(2)+' km/h';
  $('rescue-contact').textContent=force(o?(o.contactMetrics?.[boat().id]?.peakForce??0):result.peakForce);
  $('rescue-map-state').textContent=o?status.message:engines(result);
  $('rescue-map-pickup').hidden=!o;$('rescue-dismiss').hidden=!!o;
 }
 refresh();return refresh;
}
