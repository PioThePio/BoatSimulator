import {setMainPower,electricalStep} from './electrical.js';
const $=s=>document.querySelector(s);
export function installPowerPanel(api){
 const host=$('.bilge-controls'),pump=$('#bilge-pump'),auto=$('#bilge-auto').closest('label');
 host.id='marine-power';host.setAttribute('aria-label','Przełączniki zasilania łodzi');
 host.replaceChildren();
 const grid=document.createElement('div');grid.className='marine-switch-grid';host.append(grid);
 const switches=[['master','Główne zasilanie'],['instruments','Instrumenty'],['pump','Pompa'],['thrusters','Strumieniowe'],['gps','GPS'],['sonar','Echosonda']];
 for(const [name,label]of switches){
  if(name==='pump'){pump.classList.add('marine-rocker');grid.append(pump);continue;}
  let input=$('#'+(name==='sonar'?'sonar-toggle':'power-'+name));
  if(input){const old=input.closest('label');input.remove();old?.remove();}
  else{input=document.createElement('input');input.type='checkbox';input.id='power-'+name;}
  const shell=document.createElement('label');shell.className='marine-rocker';shell.dataset.device=name;
  shell.innerHTML='<span class="rocker-face" aria-hidden="true"><i></i></span><span class="rocker-caption">'+label+'</span>';shell.prepend(input);grid.append(shell);
  input.setAttribute('aria-label',label);
  input.onchange=e=>{const b=api.boat();if(name==='master')setMainPower(b,e.target.checked);else{b.electrics[name]=e.target.checked;electricalStep(b,0);}sync();api.refresh();};
 }
 const footer=document.createElement('div');footer.className='power-panel-footer';auto.hidden=true;footer.append(auto);const state=document.createElement('output');state.id='power-battery';footer.append(state);host.append(footer);
 function sync(){
  const b=api.boat(),live=b.electrics.master!==false;
  for(const [name]of switches){if(name==='pump')continue;const input=$('#'+(name==='sonar'?'sonar-toggle':'power-'+name));input.checked=!!b.electrics[name];input.disabled=name==='thrusters'&&!b.spec.bowThruster&&!b.spec.sternThruster;input.closest('label').dataset.powered=String(name==='master'?live:name==='thrusters'?live&&input.checked&&!input.disabled:b.electrics.powered[name]);}
  host.dataset.master=String(live);$('#power-battery').textContent=Math.round(b.battery.soc*100)+'% · '+b.battery.voltage.toFixed(1)+' V';
  $('#power-battery').classList.toggle('danger',b.battery.soc<.2||b.battery.voltage<11.5);$('#instruments').classList.toggle('master-power-off',!live);
  pump.title='OFF / AUTO / ON · dwie diody: AUTO i praca pompy. Wymaga głównego zasilania.';
 }
 sync();return sync;
}
