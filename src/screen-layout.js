import {FUEL_STATIONS} from './world.js';
import {fuelBerthStatus} from './systems.js';
const $=s=>document.querySelector(s);
export function installScreenLayout({boat,save}){
 const wrap=$('.water-wrap'),help=$('#help');wrap.append(help);help.classList.add('map-help');$('header')?.remove();const credit=document.createElement('a');credit.className='map-attribution';credit.href='https://www.openstreetmap.org/copyright';credit.target='_blank';credit.rel='noopener noreferrer';credit.textContent='Euzebia / Pilawa · © OpenStreetMap';wrap.append(credit);
 const instructions=$('#instructions');$('#info').append(instructions);$('footer')?.remove();
 const alerts=document.createElement('div');alerts.className='map-alert-stack';alerts.append($('#engine-warning'),$('#toast'));wrap.append(alerts);
 $('.controls').append($('.vehicle-selector'),$('.console-tools'));
 const trip=document.createElement('dialog');trip.id='trip-dialog';trip.innerHTML='<div class="setup-heading"><h2>Rejs i instalacja</h2><button class="round" aria-label="Zamknij rejs">×</button></div>';trip.append($('.operations-panel'),$('.bottom-note'));wrap.append(trip);
 const tripButton=document.createElement('button');tripButton.id='trip-open';tripButton.textContent='Rejs';$('.map-toolbar>div').append(tripButton);tripButton.onclick=()=>trip.open?trip.close():trip.show();trip.querySelector('button').onclick=()=>trip.close();
 const anchor=$('.anchor-panel'),popup=$('#anchor-picker');$('#map-anchor-target').closest('label').remove();$('#map-anchor-suggest').remove();$('#map-anchor-advice').remove();
 $('#anchor-state').remove();popup.append(...anchor.querySelectorAll('.anchor-target,#anchor-progress,.anchor-stats,#anchor-profile,#anchor-rode,#anchor-advice,#anchor-suggest'));
 const oldMapButtons=popup.querySelector('.anchor-buttons');oldMapButtons?.remove();anchor.remove();
 const detail=document.createElement('small');detail.id='anchor-bottom-info';popup.append(detail);$('#anchor-profile').width=360;$('#anchor-profile').height=130;
 const slip=$('.slip-panel');if(slip)trip.append(slip);$('#settings')?.remove();
 const fuel=document.createElement('section');fuel.id='fuel-picker';fuel.className='map-popup fuel-popup';fuel.hidden=true;fuel.innerHTML='<strong id="fuel-station-name">Stacja paliw</strong><button id="fuel-close" class="popup-close" aria-label="Zamknij tankowanie">×</button><p id="fuel-menu-state"></p><p id="fuel-menu-level"></p>';
 fuel.append($('#refuel'));wrap.append(fuel);let station=null;
 $('#fuel-close').onclick=()=>fuel.hidden=true;
 function refreshFuel(){if(!station||fuel.hidden)return;const b=boat(),near=Math.hypot(b.x-station.x,b.y-station.y)<25,status=fuelBerthStatus(b);$('#fuel-menu-state').textContent=near?status.message:'Podejdź do tej stacji i przycumuj.';$('#fuel-menu-level').textContent=`${b.fuel.litres.toFixed(1)} / ${b.fuel.capacity} l${b.fuel.refueling?' · TANKOWANIE':''}`;$('#refuel').disabled=!near;}
 return{refreshFuel,openFuel(q){station=q;fuel.hidden=false;$('#fuel-station-name').textContent=q.id==='pilawa-fuel'?'ORLEN · Pilawa':'Stacja paliw · Rynia';refreshFuel();},close(){fuel.hidden=true;$('#rescue-panel').hidden=true;if(trip.open)trip.close();}};
}
