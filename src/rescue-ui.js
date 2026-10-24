import {RESCUE_TYPES,pickupStatus} from './rescue.js';
import {throwRescue,recoverRescue} from './rescue-scene.js';
export function installRescueUI({fleet,boat,vehicle,toast,save,focus}){
 const panel=document.createElement('details');panel.className='rescue-panel';panel.id='rescue-panel';panel.innerHTML=`<summary>◎ Ratownictwo · ćwiczenie MOB</summary><div class="rescue-controls"><select id="rescue-kind" aria-label="Obiekt ratunkowy">${Object.entries(RESCUE_TYPES).map(([id,p])=>`<option value="${id}">${p.name}</option>`).join('')}</select><select id="rescue-side" aria-label="Burta rzutu"><option value="1">Prawa burta</option><option value="-1">Lewa burta</option></select><button id="rescue-throw" class="secondary">Wyrzuć</button><select id="rescue-target" aria-label="Obiekt do podjęcia"><option value="">Brak obiektów</option></select><button id="rescue-focus" class="secondary">Pokaż</button><button id="rescue-pickup" class="secondary">Podejmij</button><output id="rescue-status" aria-live="polite"></output></div>`;
 document.querySelector('.controls').after(panel);const $=id=>panel.querySelector('#'+id);let signature='';
 $('rescue-throw').onclick=()=>{const r=throwRescue(fleet(),boat(),$('rescue-kind').value,+$('rescue-side').value);toast(r.message);if(r.ok){refresh();$('rescue-target').value=r.object.id;save();}};
 $('rescue-pickup').onclick=()=>{const r=recoverRescue(fleet(),boat(),$('rescue-target').value);toast(r.message);if(r.ok)save();refresh();};
 $('rescue-focus').onclick=()=>{const o=fleet().rescue.objects.find(o=>o.id===$('rescue-target').value);if(o)focus(o);};
 function refresh(){panel.hidden=vehicle()!=='boat';const state=fleet().rescue,objects=state?.objects.filter(o=>!o.recovered)??[],next=objects.map(o=>o.id).join(',');
  if(signature!==next){signature=next;const old=$('rescue-target').value;$('rescue-target').replaceChildren(...objects.map(o=>new Option(RESCUE_TYPES[o.kind].name+' · '+o.id.slice(7),o.id)));if(objects.some(o=>o.id===old))$('rescue-target').value=old;}
  const o=objects.find(o=>o.id===$('rescue-target').value),status=pickupStatus(boat(),o);$('rescue-pickup').disabled=!status.ok;$('rescue-focus').disabled=!o;
  $('rescue-status').textContent=o?`${Math.hypot(o.x-boat().x,o.y-boat().y).toFixed(1)} m · ${Math.round(fleet().time-o.thrownAt)} s · ${status.message}`:`Podjęte: ${state?.recovered??0} · kontakty kadłubem: ${state?.contacts??0}`;
 }refresh();return refresh;
}
