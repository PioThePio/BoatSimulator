import {DESTINATIONS,destinationStatus} from './navigation.js';
import {operationalTimeScale} from './operations.js';
const $=s=>document.querySelector(s);
export function duration(seconds){if(seconds===null)return'—';const n=Math.floor(seconds);return[Math.floor(n/3600),Math.floor(n/60)%60,n%60].map(v=>String(v).padStart(2,'0')).join(':');}
export function installOperationsUI(api){
 $('.controls').insertAdjacentHTML('afterend',`<section class="operations-panel" aria-label="Eksploatacja i instalacja łodzi"><div class="operations-title"><strong id="operations-title">Rejs · liczniki</strong><small title="Fizyka pracuje 1:1; czas eksploatacyjny i przebieg kompensują skalę mapy 70%">Czas i przebieg logiczny ×${operationalTimeScale.toFixed(3)}</small></div><div class="operations-readings"><div><span>Czas rejsu</span><output id="trip-time">00:00:00</output></div><div><span>Przebieg</span><output id="trip-distance">0.000 km</output></div><div><span>Motogodziny</span><output id="engine-hours">0.000 h</output></div><div><span>Zużyto paliwa</span><output id="trip-fuel">0.00 l</output></div></div><div id="navigation-controls"><label for="destination">Cel GPS <select id="destination"><option value="">Bez celu</option>${DESTINATIONS.map(q=>`<option value="${q.id}">${q.name}</option>`).join('')}</select></label><span id="destination-distance">—</span><span>ETA <output id="destination-eta">—</output></span><small>W linii prostej · czas logiczny</small></div><details id="electrical-panel"><summary>Instalacja 12 V <span id="electrical-summary"></span></summary><div class="electrical-switches">${[['navigationLights','Światła nawigacyjne'],['gps','GPS'],['instruments','Instrumenty']].map(([name,label])=>`<label><input type="checkbox" id="power-${name}" ${name==='navigationLights'?'':'checked'}> ${label}</label>`).join('')}<small>Echosonda: przełącznik w konsoli · pompa AUTO: bezpośrednio z akumulatora</small></div><div class="electrical-readings"><span>Akumulator <b id="battery-charge">85%</b></span><span>Odbiorniki <b id="electrical-load">0 A</b></span><span>Alternator <b id="alternator-current">0 A</b></span><span>Bilans <b id="battery-current">0 A</b></span></div><small id="electrical-loads"></small></details></section>`);
 for(const name of ['navigationLights','gps','instruments'])$('#power-'+name).onchange=e=>api.boat().electrics[name]=e.target.checked;
 let destination='';$('#destination').onchange=e=>destination=e.target.value;
 return()=>{
  const b=api.boat(),car=api.vehicle()==='suv',rig=api.rig(),stats=car?rig.operations:b.operations,engines=car?[rig.engine]:b.engines;
  $('.operations-panel').setAttribute('aria-label',car?'Eksploatacja SUV-a':'Eksploatacja i instalacja łodzi');$('#operations-title').textContent=car?'SUV · liczniki':'Rejs · liczniki';$('.operations-readings>div:first-child>span').textContent=car?'Czas podróży':'Czas rejsu';
  $('#trip-time').textContent=duration(stats.seconds);$('#trip-time').title='Czas fizyki '+duration(stats.physicalSeconds);
  $('#trip-distance').textContent=(stats.distance/1000).toFixed(3)+' km';$('#trip-distance').title='Na mapie '+stats.physicalDistance.toFixed(1)+' m';
  $('#engine-hours').textContent=engines.map((en,i)=>(engines.length>1?(i?'P ':'L '):'')+(en.operatingHours??0).toFixed(3)+' h').join(' · ');
  $('#trip-fuel').textContent=stats.fuelUsed.toFixed(2)+' l';
  $('#navigation-controls').hidden=car;$('#electrical-panel').hidden=car;
  const status=destinationStatus(b,destination);$('#destination-distance').textContent=status.distance===null?'—':(status.distance/1000).toFixed(2)+' km';$('#destination-eta').textContent=status.arrived?'Na miejscu':duration(status.eta);$('#destination-eta').title=!b.electrics.powered.gps?'GPS bez zasilania':'Przybliżony czas logiczny do punktu podejścia, przy aktualnej prędkości zbliżania';
  for(const name of ['navigationLights','gps','instruments'])$('#power-'+name).checked=b.electrics[name];
  const battery=b.battery;$('#battery-charge').textContent=(battery.soc*100).toFixed(1)+'%';$('#electrical-load').textContent=(battery.loadCurrent??0).toFixed(1)+' A';$('#alternator-current').textContent=(battery.alternatorCurrent??0).toFixed(1)+' A';$('#battery-current').textContent=(battery.current>=0?'−':'+')+Math.abs(battery.current).toFixed(1)+' A';
  $('#electrical-summary').textContent=battery.voltage.toFixed(1)+' V · '+(battery.current<0?'ładowanie':'pobór');
  const names={ignition:'zapłon',starter:'rozrusznik',thrusters:'strumieniowe',bilge:'pompa',navigationLights:'światła',gps:'GPS',sonar:'echosonda',instruments:'instrumenty'};
  $('#electrical-loads').textContent=Object.entries(battery.loads??{}).filter(([,a])=>a>0).map(([name,a])=>names[name]+' '+a.toFixed(1)+' A').join(' · ')||'Odbiorniki wyłączone';
  $('#instruments').classList.toggle('instrument-power-off',!car&&!b.electrics.powered.instruments);
 };
}
