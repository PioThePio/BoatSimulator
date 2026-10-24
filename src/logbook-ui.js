import {createLogbook,readLogbook,writeLogbook,captureLogbook,setLogbookEnabled} from './logbook.js';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const duration=s=>`${Math.floor(s/3600)} h ${Math.floor(s/60)%60} min`;
export function installLogbook({fleet,ready,toast}){
 let storage;try{storage=localStorage;}catch{}let book=storage?readLogbook(storage):createLogbook();
 const button=document.createElement('button');button.id='logbook-open';button.textContent='▤ Logbook';document.querySelector('#fleet-open').after(button);
 const modal=document.createElement('dialog');modal.id='logbook-dialog';modal.setAttribute('aria-label','Logbook · dziennik rejsów');modal.innerHTML='<div class="setup-heading"><h2>Logbook · dziennik rejsów</h2><button id="logbook-close" class="round" aria-label="Zamknij logbook">×</button></div><label class="logbook-option"><input id="logbook-enabled" type="checkbox"> Zapisuj dziennik lokalnie</label><div id="logbook-totals" class="logbook-tiles"></div><h3>Ostatnie rejsy</h3><div id="logbook-sessions"></div><h3>Ostatnie incydenty</h3><div id="logbook-events"></div>';document.body.append(modal);
 function ensure(){if(!fleet().logbookId)fleet().logbookId=globalThis.crypto?.randomUUID?.()??'rejs-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
 function persist(){if(!ready())return;ensure();book=captureLogbook(book,fleet());if(!storage||!writeLogbook(storage,book))toast('Logbook: przeglądarka nie pozwala zapisać dziennika.');}
 function render(){persist();modal.querySelector('#logbook-enabled').checked=book.enabled;const t=book.totals;modal.querySelector('#logbook-totals').innerHTML=[['Dystans na wodzie',(t.distance/1000).toFixed(2)+' km'],['Motogodziny',t.hours.toFixed(2)+' h'],['Zużyte paliwo',t.fuel.toFixed(2)+' l'],['Uderzenia',Math.round(t.collisions)]].map(([a,b])=>`<div><small>${a}</small><strong>${b}</strong></div>`).join('');
  modal.querySelector('#logbook-sessions').innerHTML=book.sessions.length?book.sessions.map(r=>`<div class="logbook-row"><time>${new Date(r.date).toLocaleString('pl-PL')}</time><span>${duration(r.duration)} · ${(r.distance/1000).toFixed(2)} km · ${r.fuel.toFixed(2)} l · max ${(r.maxSpeed*3.6).toFixed(1)} km/h</span></div>`).join(''):'Brak zapisanych rejsów.';
  modal.querySelector('#logbook-events').innerHTML=book.events.length?book.events.map(e=>`<div class="logbook-row"><time>${new Date(e.timestamp).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}</time><span>${esc(e.boat)} · ${esc(e.message)}</span></div>`).join(''):'Brak incydentów.';
 }
 button.onclick=()=>{render();modal.showModal();};modal.querySelector('#logbook-close').onclick=()=>modal.close();modal.querySelector('#logbook-enabled').onchange=e=>{if(ready())ensure();book=setLogbookEnabled(book,fleet(),e.target.checked);if(storage)writeLogbook(storage,book);render();};
 return{persist,ensure,open:()=>button.click()};
}
