import {draggablePopup} from './popup.js';
export function installControlSettings(){
 const settings={boat:1.3,suv:1.2},$=s=>document.querySelector(s);
 try{const saved=JSON.parse(localStorage.getItem('przystan-steering')||'null');for(const key of ['boat','suv'])if(Number.isFinite(saved?.[key]))settings[key]=Math.max(.5,Math.min(3,saved[key]));}catch{}
 $('.wheel-section').insertAdjacentHTML('beforeend','<button id="steering-settings-open" class="text-button">⚙ Szybkość kierownicy</button>');
 $('.water-wrap').insertAdjacentHTML('beforeend',`<aside id="steering-settings" class="map-popup steering-settings" hidden aria-label="Ustawienia kierownicy"><div class="popup-heading" id="steering-settings-handle"><h3>Kierownica · klawiatura</h3><button id="steering-settings-close" aria-label="Zamknij sterowanie">×</button></div>${[['boat','Łódź'],['suv','SUV']].map(([key,name])=>`<label for="steering-rate-${key}">${name} <output id="steering-rate-value-${key}"></output></label><input id="steering-rate-${key}" type="range" min="0.5" max="3" step="0.1" aria-label="Szybkość kierownicy ${name}">`).join('')}<p>Zmiana działa od razu przy A/D i strzałkach. Koło pozostaje w zadanej pozycji.</p><button id="steering-settings-default" class="secondary">Przywróć domyślne</button></aside>`);
 const sync=()=>{for(const key of ['boat','suv']){$('#steering-rate-'+key).value=settings[key];$('#steering-rate-value-'+key).textContent='×'+settings[key].toFixed(1);}try{localStorage.setItem('przystan-steering',JSON.stringify(settings));}catch{}};
 for(const key of ['boat','suv']){const input=$('#steering-rate-'+key);input.oninput=e=>{settings[key]=+e.target.value;sync();};input.onpointerup=()=>input.blur();}
 $('#steering-settings-open').onclick=()=>{$('#steering-settings').hidden=!$('#steering-settings').hidden;};$('#steering-settings-close').onclick=()=>$('#steering-settings').hidden=true;$('#steering-settings-default').onclick=()=>{settings.boat=1.3;settings.suv=1.2;sync();};
 draggablePopup($('#steering-settings'),$('#steering-settings-handle'));sync();return settings;
}
