import {draggablePopup} from './popup.js';
import {BOLLARDS} from './world.js';
import {attachmentNames} from './attachment-points.js';
import {tieTraffic,untieTraffic} from './traffic-mooring.js';
export function installTrafficMooring(api){
 const panel=document.createElement('section');panel.id='traffic-mooring';panel.className='map-popup';panel.hidden=true;
 panel.innerHTML='<div class="popup-handle"><strong>Łódź portowa</strong><button aria-label="Zamknij cumowanie łodzi portowej">×</button></div><p>Wskaż poler na mapie, potem knagę łodzi.</p><strong class="npc-target"></strong><div class="npc-lines"></div>';
 document.querySelector('.water-wrap').append(panel);const drag=draggablePopup(panel,panel.firstElementChild);let selected=null,target=null;
 const refresh=()=>{if(!selected)return;panel.querySelector('strong').textContent=selected.type==='kayak'?'Kajak':'Łódź portowa';panel.querySelector('.npc-target').textContent=target===null?'Wybierz poler':BOLLARDS[target].label??BOLLARDS[target].id;const rows=panel.querySelector('.npc-lines');rows.replaceChildren();for(const[end,name]of Object.entries(attachmentNames(selected))){const row=document.createElement('div'),line=selected.ropes.find(r=>r.end===end),tie=document.createElement('button'),off=document.createElement('button');tie.textContent=name+(line?' · '+line.length.toFixed(1)+' m':' · bez cumy');tie.disabled=target===null;tie.onclick=()=>{const result=tieTraffic(api.world(),selected,end,target);api.toast(result.message);refresh();if(result.ok)api.save();};off.textContent='Odwiąż';off.disabled=!line;off.onclick=()=>{untieTraffic(selected,end);refresh();api.save();};row.append(tie,off);rows.append(row);}};
 panel.querySelector('button').onclick=()=>{panel.hidden=true;selected=null;};
 return{open(q,x,y){api.release();for(const id of['mooring-picker','anchor-picker'])document.getElementById(id).hidden=true;selected=q;target=q.ropes[0]?.bollard??null;panel.hidden=false;refresh();drag.beside(x,y,q.spec.beam*4);},target(i){if(panel.hidden)return false;target=i;refresh();return true;},close(){panel.hidden=true;selected=null;}};
}
