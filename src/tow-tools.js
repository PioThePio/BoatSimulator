import {draggablePopup} from './popup.js';
// Reuse the existing controls and hold handlers; only their container changes.
export function installTowTools(api){
 const $=s=>document.querySelector(s),panel=document.createElement('section');panel.id='tow-tools';panel.className='map-popup';panel.hidden=true;
 panel.innerHTML='<div id="tow-tools-handle" class="popup-handle" tabindex="0"><strong>Przyczepa i wciągarka</strong><span aria-hidden="true">⠿</span></div><button id="tow-tools-close" class="popup-close" aria-label="Zamknij przyczepę">×</button>';
 panel.append($('.tow-console'),$('.winch-controls'));$('.water-wrap').append(panel);draggablePopup(panel,$('#tow-tools-handle'));
 const button=document.createElement('button');button.id='tow-tools-open';button.type='button';button.textContent='▱ Przyczepa';button.setAttribute('aria-expanded','false');$('.car-drivetrain').append(button);
 const close=()=>{panel.hidden=true;button.setAttribute('aria-expanded','false');api.rig().winch.control=0;};
 button.onclick=()=>{if(!panel.hidden)return close();panel.hidden=false;button.setAttribute('aria-expanded','true');};$('#tow-tools-close').onclick=close;
 $('#car-handbrake').textContent='Ⓟ Ręczny';$('#car-handbrake').title='Hamulec ręczny · Spacja';
 $('.tow-attitude').append($('#car-incline'),$('#loading-score'));
 const hint=$('#car-controls>.hint');hint.title=hint.textContent;hint.textContent='W/↑ gaz · S/↓ hamulec · Spacja ręczny · Q/E biegi';
 return{refresh(){if(api.vehicle()!=='suv')close();}};
}
