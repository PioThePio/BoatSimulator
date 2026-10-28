import {trafficAt} from './traffic-mooring.js';
import {installTrafficMooring} from './traffic-mooring-ui.js';
import {installDepotUI} from './depot-ui.js';
import {mooringGear} from './mooring-gear.js';
import {mooringDiagram,compactLineText} from './mooring-view.js';
import {dieselAvailable} from './combustion.js';
import {compactPropulsion} from './helm-refinements.js';
import {placeMapMessage} from './map-messages.js';
import {installScreenLayout} from './screen-layout.js';
import {installRestoreHistory} from './restore-history.js';
import {installMapAlerts} from './map-alerts.js';
import {installNavigationLegend} from './render-navigation.js';
import {installLogbook} from './logbook-ui.js';
import {helpMarkup} from './help.js';
import {attachmentNames} from './attachment-points.js';
import {connectBoatPoints} from './marine-tow.js';
import {fleetName} from './fleet-craft.js';
import {spawnFleetCraft} from './fleet-spawns.js';
import './style.css';
import './helm.css';
import './fleet.css';
import './screen.css';
import './console-tidy.css';
import {createFleet,activeBoat,rigBoat,addFleetBoat,selectFleetBoat,fleetStep,recordFleetTrails,removeFleetBoat} from './fleet.js';
import {installFleetUI} from './fleet-ui.js';
import {installRescueUI} from './rescue-ui.js';
import {readAutosave,writeAutosave,AUTOSAVE_SECONDS} from './session-save.js';
import {installPowerPanel} from './power-panel.js';
import {createAtlas,atlasProjection,zoomAtlas,installMapGestures} from './map-controls.js';
import {installOperationsUI} from './operations-ui.js';
import {installControlSettings} from './control-settings.js';
import {ropeLoadState} from './rope-load.js';
import {markup} from './layout.js';
import {createBoat,point,cleat,attachRope,environment,clamp,bottomAt,waveAt} from './physics.js';
import {CRAFTS,specification} from './craft.js';
import {BOLLARDS,WORLD,weatherAt,waveHeight,waveHeightAt,shoreAt,SERVICE_STATION,REMOTE_HARBORS,MAP_LABELS,MAP_POIS,FUEL_STATIONS} from './world.js';
import {nearService} from './service.js';
import {installCockpit} from './cockpit.js';
import {renderWorld,renderMinimap} from './render.js';
import {CREEP,throttleValue,throttleStep,angleDelta,rimPosition} from './controls.js';
import {CLEATS,requestHaul,anchorCommand,anchorProfile} from './rigging.js';
import {mooringPoint} from './marina.js';
import {draggablePopup} from './popup.js';
import {anchorAdvice} from './drive.js';
import {createSoundscape} from './sound.js';
import {SUV,createTowRig,towAudioBoat,selectCarGear,stepCarGear,toggleHandbrake} from './towing.js';
import {installTowCockpit} from './tow-cockpit.js';
const $=s=>document.querySelector(s);
$('#app').innerHTML=markup();
const sound=createSoundscape();
const steeringSettings=installControlSettings();
try{const saved=JSON.parse(localStorage.getItem('przystan-sound')||'null');if(saved){$('#sound-toggle').checked=saved.enabled;$('#sound-volume').value=saved.volume;$('#engine-volume').value=saved.engineVolume??100;}}catch{}
function soundSettings(){sound.setEnabled($('#sound-toggle').checked);sound.setVolume(+$('#sound-volume').value/100);sound.setEngineVolume(+$('#engine-volume').value/100);$('#engine-volume-value').textContent=$('#engine-volume').value+'%';try{localStorage.setItem('przystan-sound',JSON.stringify({enabled:$('#sound-toggle').checked,volume:+$('#sound-volume').value,engineVolume:+$('#engine-volume').value}));}catch{}}
soundSettings();document.addEventListener('pointerdown',()=>sound.unlock(),{capture:true});document.addEventListener('keydown',()=>sound.unlock(),{capture:true});
window.addEventListener('blur',()=>sound.setActive(false));document.addEventListener('visibilitychange',()=>{if(document.hidden)sound.setActive(false);});
$('#sound-toggle').onchange=()=>{soundSettings();sound.unlock();};$('#sound-volume').oninput=$('#engine-volume').oninput=soundSettings;
let start='lake',boatOptions={profile:'runabout',engineCount:1,powers:[90,90],coldStart:true},boat=createBoat(start,boatOptions);
let vehicle='boat',towRig=createTowRig(boat);
let fleet=createFleet(boat),sessionReady=false,restoreHistory=null,screenUI=null,pendingPlacement=null,lastAutosave=performance.now();
$('#steering-settings').insertAdjacentHTML('beforeend',`<fieldset id="twin-steering" hidden><legend>Kąty dwóch napędów</legend><label><input id="link-steering" type="checkbox" checked> Wspólna kierownica</label>${['Lewy','Prawy'].map((name,i)=>`<label>${name} <output id="drive-angle-${i}">0°</output><input id="drive-steer-${i}" aria-label="Kąt napędu ${name.toLowerCase()}" type="range" min="-45" max="45" step="1" value="0" disabled></label>`).join('')}</fieldset>`);
$('#link-steering').onchange=e=>{for(const en of boat.engines)en.steerTarget=e.target.checked?null:boat.actualSteer;syncControls();};
for(const i of [0,1])$('#drive-steer-'+i).oninput=e=>{if(boat.engines[i])boat.engines[i].steerTarget=+e.target.value*Math.PI/180;syncControls();};
let speedUnit='km/h';const flowUnits={wind:'m/s',current:'m/s'};
try{speedUnit=localStorage.getItem('przystan-speed-unit')==='kn'?'kn':'km/h';for(const key of ['wind','current'])flowUnits[key]=localStorage.getItem('przystan-'+key+'-unit')==='km/h'?'km/h':'m/s';}catch{}
$('.telemetry').onclick=e=>{if(e.target.closest('button'))return;speedUnit=speedUnit==='km/h'?'kn':'km/h';try{localStorage.setItem('przystan-speed-unit',speedUnit);}catch{}telemetry();};$('.telemetry').onkeydown=e=>{if(e.target===$('.telemetry')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();$('.telemetry').click();}};
document.addEventListener('click',e=>{const button=e.target.closest('[data-flow-unit]');if(!button)return;const key=button.dataset.flowUnit;flowUnits[key]=flowUnits[key]==='m/s'?'km/h':'m/s';try{localStorage.setItem('przystan-'+key+'-unit',flowUnits[key]);}catch{}telemetry();});
let atlas=createAtlas();
let paused=false,zoom=1,follow=true,overview=false,manualCenter=null,centerReference={x:boat.x,y:boat.y},selectedEngine=0,selectedTarget=null;
let trail=boat.trail,view=null,sonarHistory=[],sonarTime=0,lastEvent=null,last=performance.now(),accumulator=0,telemetryAt=0,soundAt=-Infinity;
const env={windSpeed:0,windDirection:90,currentSpeed:0,currentDirection:90,gusts:false,waveHeight:0,waveDirection:90,autoWaves:true,spatialEffects:true,traffic:true};
const keys=new Set(),keyTimes=new Map(),blockedGas=new Set();
let toastTimer;
function toast(t){placeMapMessage($('#toast'),t);$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),3600);}
const wheelRatio=()=>{const s=vehicle==='suv'?SUV:boat.spec;return s.wheelTurns*Math.PI/s.maxSteer;};
function gearLabel(v){return Math.abs(v)<.035?'N · LUZ':Math.abs(v)<=CREEP+.005?`${v>0?'F':'R'} · PEŁZAJĄCY`:`${v>0?'F · NAPRZÓD':'R · WSTECZ'} ${Math.abs(Math.round(v*100))}%`;}
function syncControls(){
 const independent=Number.isFinite(boat.engines[0].steerTarget);$('#twin-steering').hidden=vehicle!=='boat'||boat.spec.engineCount!==2||!['outboard','zdrive'].includes(boat.spec.propulsion);$('#link-steering').checked=!independent;
 for(const [i,en]of boat.engines.entries()){const input=$('#drive-steer-'+i);input.disabled=!independent;input.value=Math.round((en.steerTarget??boat.steer)*180/Math.PI);$('#drive-angle-'+i).textContent=input.value+'°';}
 const S=boat.spec,R=vehicle==='suv'?towRig:boat,limit=vehicle==='suv'?SUV.maxSteer:S.maxSteer,deg=Math.round(R.steer*180/Math.PI);$('#steer-label').textContent=deg+'°';const actual=R.actualSteer*180/Math.PI;$('#rudder-angle').textContent=(actual>1?'P ':actual< -1?'L ':'')+Math.abs(actual).toFixed(0)+'°';$('#rudder-command').style.left=(50+R.steer/limit*46)+'%';$('#rudder-actual').style.left=(50+R.actualSteer/limit*46)+'%';$('#wheel svg').style.transform=`rotate(${R.steer*180/Math.PI*wheelRatio()}deg)`;$('#wheel').setAttribute('aria-valuenow',deg);$('#wheel').setAttribute('aria-valuemax',Math.round(limit*180/Math.PI));$('#wheel').setAttribute('aria-valuemin',-Math.round(limit*180/Math.PI));
 $('#throttle').min=boat.spec.air?'0':'-100';$('#throttle2').min=boat.spec.air?'0':'-100';$('#throttle').value=Math.round(boat.throttle*100);$('#throttle2').value=Math.round(boat.throttle2*100);$('#gear').textContent=gearLabel(boat.throttle);$('#gear2').textContent=gearLabel(boat.throttle2);
 $('#throttle').disabled=S.passive&&!S.manual;if(S.passive)$('#gear').textContent=S.manual?'WIOSŁA · '+Math.round(Math.abs(boat.throttle)*100)+'%':'BEZ NAPĘDU';
 $('#second-engine').hidden=S.engineCount!==2;$('#ignition-1').hidden=S.engineCount!==2;$('.engine-link-controls').hidden=S.engineCount!==2;$('#link-engines').checked=boat.linked;$('#fenders').checked=boat.fenders;
 $('#wheel-travel').textContent=S.jet?'Skuter · 90° kierownicy':`${S.wheelTurns.toLocaleString('pl-PL')} obrotu od oporu do oporu`;$('#wheel').dataset.travel=String(S.wheelTurns);
 $('#first-engine').classList.toggle('selected',selectedEngine===0&&!boat.linked);$('#second-engine').classList.toggle('selected',selectedEngine===1&&!boat.linked);
 $('#keyboard-engine').textContent=S.engineCount===1?'SOLO':boat.linked?'L + P':selectedEngine?'PRAWA':'LEWA';$('#engine-select-hint').textContent=S.passive?(S.manual?'W / S: wysiłek wiosłowania · A / D: zmiana kierunku.':'Bez napędu. Holowanie, cumy i kotwica działają jak w łodzi.'):S.air?'Śmigło powietrzne · brak wstecznego. Manewruj gazem i sterami.':S.engineCount===2&&!boat.linked?'Kliknij manetkę, aby wybrać ją dla przycisków i klawiatury (1 / 2).':'Pierwszy krok: bieg pełzający.';
 const preview=$('#setup-dialog').open?specification({profile:$('#craft').value,length:+$('#boat-length').value,beam:+$('#boat-beam').value,hullMass:+$('#boat-mass').value,engineCount:+$('#engine-count').value,powers:[+$('#power-left').value,+$('#power-right').value],initialFuelLitres:+$('#fuel-capacity').value,crewCount:+$('#crew-count').value,equipmentMass:+$('#equipment-mass').value,propulsion:$('#propulsion').value,engineType:$('#engine-type').value,tankCount:+$('#tank-count').value,bowThruster:$('#bow-thruster').checked,sternThruster:$('#stern-thruster').checked}):S;$('#craft-summary').textContent=`${Math.round(preview.mass)} kg z załogą i paliwem · zanurzenie ${preview.draft.toFixed(2)} m`;
 $('#craft-state').textContent=`${S.length.toFixed(1)} × ${S.beam.toFixed(2)} m · ${Math.round(S.mass)} kg · ${S.powers.join(' + ')} KM`;
 $('#line-break').textContent=`· zerwanie ${(S.lineBreak/1000).toFixed(0)} kN`;
 $('.wheel-section h2').textContent=vehicle==='suv'?'Kierownica SUV-a':'Koło sterowe';$('.throttle-section h2').textContent=vehicle==='suv'?'SUV · napęd':'Napęd';if(vehicle==='suv'){$('#keyboard-engine').textContent=towRig.gear==='D'?'D'+(towRig.autoGear??1):towRig.gear;$('#craft-state').textContent=`Zestaw ${Math.round(towRig.car.mass+(towRig.attached?towRig.trailer.mass:0))} kg · przyczepa ${towRig.trailer.beam.toFixed(2)} m szer.`;$('#wheel-travel').textContent='SUV · 2½ obrotu od oporu do oporu';}
}
function setSteer(v){if(vehicle==='suv')towRig.steer=clamp(v,-SUV.maxSteer,SUV.maxSteer);else boat.steer=clamp(v,-boat.spec.maxSteer,boat.spec.maxSteer);syncControls();}
function setThrottle(v,index=selectedEngine){v=boat.damage>=100||boat.spec.passive&&!boat.spec.manual?0:throttleValue(boat.spec.air?Math.max(0,v):v);selectedEngine=index;if(boat.linked||boat.spec.engineCount===1)boat.throttle=boat.throttle2=v;else if(index===0)boat.throttle=v;else boat.throttle2=v;syncControls();}
function neutralAll(){boat.throttle=boat.throttle2=0;for(const k of ['w','s','arrowup','arrowdown'])if(keys.has(k)){keys.delete(k);blockedGas.add(k);}syncControls();}
const cockpitApi={boat:()=>boat,selected:()=>selectedEngine,setThrottle,neutral:neutralAll,toast,env,vehicle:()=>vehicle};
const updateCockpit=installCockpit(cockpitApi);
const towApi={boat:()=>boat,rig:()=>towRig,vehicle:()=>vehicle,setVehicle,toast,afterReset:()=>{keys.clear();blockedGas.clear();releaseRopeControls();centerBoat();renderRopes();syncControls();telemetry();}};
const updateTowCockpit=installTowCockpit(towApi);
const attitudeColumn=document.createElement('div');attitudeColumn.className='attitude-column';$('#instruments').after(attitudeColumn);const hydroReadings=document.createElement('div');hydroReadings.className='hydro-readings';$('.draft-readings').before(hydroReadings);hydroReadings.append($('.draft-readings'),$('.bilge-panel'));attitudeColumn.append($('.pitch-gauge'),$('.tow-attitude'));
const pumpControls=document.createElement('div');pumpControls.className='bilge-controls';pumpControls.append($('#bilge-pump'),$('#bilge-auto').closest('label'));$('.throttle-section').append(pumpControls);
const serviceMap=document.createElement('div');serviceMap.id='service-map';serviceMap.hidden=true;serviceMap.append($('#repair'),$('#repair-status'));$('.water-wrap').append(serviceMap);
const updateOperations=installOperationsUI({boat:()=>boat,rig:()=>towRig,vehicle:()=>vehicle});
const updatePowerPanel=installPowerPanel({boat:()=>boat,refresh:()=>telemetry()});
const fleetUI=installFleetUI({fleet:()=>fleet,vehicle:()=>vehicle,env,toast,save:saveGame,adoptTrailer:b=>{towRig=b.towRig;selectBoat(b.id);setVehicle('suv');centerBoat();telemetry();},remove:id=>{releaseAllHolds();logbook.persist();const r=removeFleetBoat(fleet,id);toast(r.message);if(r.ok){if(boat.id===id){boat=r.boat;vehicle='boat';trail=boat.trail;selectedEngine=0;sonarHistory=[];sonarTime=0;lastEvent=null;$('#destination').value=boat.navigationTarget??'';centerBoat();}selectedTarget=null;$('#mooring-picker').hidden=true;renderRopes();syncControls();telemetry();saveGame();}},release:releaseAllHolds,select:selectBoat,focus:id=>{const b=fleet.boats.find(q=>q.id===id);if(b){overview=false;follow=false;manualCenter={x:b.x,y:b.y};}},place:request=>pendingPlacement=request});
const updateDepot=installDepotUI({fleet:()=>fleet,vehicle:()=>vehicle,release:releaseAllHolds,toast,save:saveGame,refresh:()=>telemetry()});
const logbook=installLogbook({fleet:()=>fleet,ready:()=>sessionReady,toast});installNavigationLegend();
const updateRescue=installRescueUI({fleet:()=>fleet,boat:()=>boat,vehicle:()=>vehicle,toast,save:saveGame,focus:o=>{overview=false;follow=false;manualCenter={x:o.x,y:o.y};}});
function releaseAllHolds(){keys.clear();blockedGas.clear();releaseRopeControls();towApi.clearCarPedals();cockpitApi.holds.bow=cockpitApi.holds.stern=0;for(const b of fleet.boats)b.thrusters.bow=b.thrusters.stern=0;for(const r of fleet.tows)r.control=0;}
function selectBoat(id){
 npcMooring.close(); if(vehicle==='suv'&&Math.hypot(towRig.car.vx,towRig.car.vy)>.15){toast('Zatrzymaj SUV-a przed przesiadką.');return;}
 releaseAllHolds();boat.navigationTarget=$('#destination').value;
 const result=selectFleetBoat(fleet,id);if(!result.ok){toast(result.message);return;}
 boat=result.boat;vehicle='boat';trail=boat.trail;selectedEngine=0;sonarHistory=[];sonarTime=0;lastEvent=null;selectedTarget=null;$('#destination').value=boat.navigationTarget??'';$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;centerBoat();renderRopes();syncControls();telemetry();toast(result.message);saveGame();
}
const weatherFields=['preset','wind','wind-min','wind-dir','wind-dir-variation','current','current-min','current-dir','current-dir-variation','waves','wave-dir','auto-waves','spatial-effects','traffic','hydro-interactions','tow-effects','wind-visuals','wind-sound','navigation-marks','slip-angle'];
function saveGame(){
 if(!sessionReady)return;logbook.ensure();
 boat.navigationTarget=$('#destination').value;
 const weather=Object.fromEntries(weatherFields.map(id=>{const el=$('#'+id);return[id,el.type==='checkbox'?el.checked:el.value];}));
 let result;try{result=writeAutosave(localStorage,{fleet,towRig,env,start,boatOptions,vehicle,weather,ui:{zoom,follow,overview,manualCenter,centerReference,atlas,showTrail,selectedEngine,sonarHistory,sonarTime}});}catch{result={ok:false,message:'Przeglądarka blokuje zapis lokalny.'};}
 if(result.ok&&restoreHistory)try{restoreHistory.record(localStorage.getItem('przystan-session-v1'),result.savedAt);}catch{}
 logbook.persist();
 $('#autosave-state').textContent=result.ok?'Zapisano lokalnie · '+new Date(result.savedAt).toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'}):result.message;$('#autosave-state').classList.toggle('danger',!result.ok);lastAutosave=performance.now();
}
window.addEventListener('pagehide',()=>{releaseAllHolds();saveGame();});window.addEventListener('blur',saveGame);document.addEventListener('visibilitychange',()=>{if(document.hidden){releaseAllHolds();saveGame();}});

function centerBoat(){follow=true;overview=false;manualCenter=null;const p=vehicle==='suv'?towRig.car:boat;centerReference={x:p.x,y:p.y};}
function setVehicle(next){npcMooring.close();const mapBase=Math.min(width/140,height/80);if(next===vehicle){if(next==='boat'&&boat.id!==fleet.rigBoatId)selectBoat(fleet.rigBoatId);return;}if(next==='boat'&&Math.hypot(towRig.car.vx,towRig.car.vy)>.15){toast('Zatrzymaj SUV-a przed przesiadką do łodzi.');return;}zoom*=((vehicle==='boat'?boat.cameraZoom:1)/(next==='boat'?boat.cameraZoom:1));neutralAll();if(next==='suv'&&boat.id!==fleet.rigBoatId){if(rigBoat(fleet).stored){boat=rigBoat(fleet);fleet.activeId=boat.id;}else selectBoat(fleet.rigBoatId);}towApi.clearCarPedals();if(next==='boat')selectCarGear(towRig,'P');vehicle=next;keys.clear();cockpitApi.holds.bow=cockpitApi.holds.stern=0;boat.thrusters.bow=boat.thrusters.stern=0;releaseRopeControls();$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;centerBoat();syncControls();telemetry();const mapRect=canvas.getBoundingClientRect();zoom*=mapBase/Math.max(.01,Math.min(mapRect.width/140,mapRect.height/80));toast(next==='suv'?'Stanowisko SUV · stacyjka, PRND · W gaz / S hamulec':'Stanowisko łodzi');saveGame();}
function reset(){npcMooring.close();screenUI?.close();if(sessionReady)logbook.persist();paused=false;$('#paused-label').hidden=true;$('#pause').textContent='Ⅱ';boat=createBoat(start,boatOptions);boat.electrics.sonar=$('#sonar-toggle').checked;towRig=createTowRig(boat,{loaded:start==='trailer',atSlip:start==='retrieve'});fleet=createFleet(boat);pendingPlacement=null;$('#placement-help').hidden=true;vehicle=start==='trailer'?'suv':'boat';towApi.clearCarPedals();selectedEngine=0;centerBoat();keys.clear();blockedGas.clear();cockpitApi.holds.bow=cockpitApi.holds.stern=0;trail=boat.trail;sonarHistory=[];sonarTime=0;lastEvent=null;selectedTarget=null;$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;renderRopes();syncControls();telemetry();accumulator=0;toast('Nowa próba · stacyjka w prawo: zapłon, następnie rozruch.');}
$('#throttle').oninput=e=>setThrottle(+e.target.value/100,0);$('#throttle2').oninput=e=>setThrottle(+e.target.value/100,1);
for(const [id,index]of [['throttle',0],['throttle2',1]])$('#'+id).onpointerdown=()=>{selectedEngine=index;syncControls();};
$('#center').onclick=()=>setSteer(0);$('#reset').onclick=()=>openSetup();
function toggleLink(){boat.linked=!boat.linked;if(boat.linked)boat.throttle2=boat.throttle;syncControls();}
$('#link-engines').onchange=toggleLink;
function togglePause(){releaseRopeControls();paused=!paused;$('#pause').textContent=paused?'▷':'Ⅱ';$('#paused-label').hidden=!paused;telemetry();}
$('#pause').onclick=togglePause;$('#fenders').onchange=e=>boat.fenders=e.target.checked;
for(const id of ['help','instructions'])$('#'+id).onclick=()=>$('#info').showModal();$('#close-dialog').onclick=()=>$('#info').close();
let drag=null;const wheel=$('#wheel');
wheel.onpointerdown=e=>{const q=rimPosition(e.clientX,e.clientY,wheel.getBoundingClientRect());if(q.radius<.25||q.radius>1.08)return;drag={angle:q.angle};wheel.setPointerCapture(e.pointerId);e.preventDefault();};
wheel.onpointermove=e=>{if(!drag)return;const q=rimPosition(e.clientX,e.clientY,wheel.getBoundingClientRect());if(q.radius>.18){setSteer((vehicle==='suv'?towRig.steer:boat.steer)+angleDelta(drag.angle,q.angle)/wheelRatio());drag.angle=q.angle;}};
wheel.onpointerup=wheel.onpointercancel=wheel.onlostpointercapture=()=>drag=null;
window.addEventListener('keydown',e=>{
 if($('#info').open||$('#setup-dialog').open||$('#fleet-dialog').open||($('#logbook-dialog')?.open||$('#navigation-legend')?.open))return;
 if(pendingPlacement&&e.key==='Escape'){pendingPlacement=null;$('#placement-help').hidden=true;return;}
 const isLever=['throttle','throttle2'].includes(e.target.id);if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&!isLever)return;
 const k=e.key.toLowerCase();if(blockedGas.has(k)){e.preventDefault();return;}if(['arrowleft','arrowright','arrowup','arrowdown',' '].includes(k))e.preventDefault();
 if(!keys.has(k))keyTimes.set(k,performance.now());keys.add(k);if(e.repeat)return;if(isLever)selectedEngine=e.target.id==='throttle2'?1:0;
 if(k==='v'){setVehicle(vehicle==='boat'?'suv':'boat');return;}
 if(vehicle==='suv'){if(k===' ')toast(toggleHandbrake(towRig).message);if(k==='q'||k==='e')toast(stepCarGear(towRig,k==='e'?1:-1).message);if(['1','2','3','4'].includes(k))toast(selectCarGear(towRig,['P','R','N','D'][+k-1]).message);if(k==='c')setSteer(0);if(k==='p')togglePause();if(k==='r')openSetup();return;}
 if(['w','arrowup','s','arrowdown'].includes(k))setThrottle(throttleStep(selectedEngine?boat.throttle2:boat.throttle,['w','arrowup'].includes(k)?1:-1));
 if(k===' ')neutralAll();if(k==='c')setSteer(0);if(k==='p')togglePause();if(k==='r')openSetup();if(k==='t')toggleLink();if(k==='1')selectedEngine=0;if(k==='2'&&boat.engines.length===2)selectedEngine=1;if(k==='f')boat.fenders=!boat.fenders;syncControls();
});
window.addEventListener('keyup',e=>{keys.delete(e.key.toLowerCase());blockedGas.delete(e.key.toLowerCase());});window.addEventListener('blur',()=>{keys.clear();blockedGas.clear();});document.addEventListener('visibilitychange',()=>{keys.clear();last=performance.now();accumulator=0;});
function readEnv(){
 for(const id of ['wind','current']){
  const lo=+$('#'+id+'-min').value,hi=+$('#'+id).value,digits=id==='wind'?1:2;
  env[id+'Min']=lo;env[id+'Max']=hi;env[id+'Speed']=(lo+hi)/2;env[id+'Direction']=+$('#'+id+'-dir').value;env[id+'DirectionVariation']=+$('#'+id+'-dir-variation').value;
  $('#'+id+'-value').textContent=(lo===hi?hi.toFixed(digits):lo.toFixed(digits)+'–'+hi.toFixed(digits))+' m/s';
  $('#'+id+'-range-min').textContent=lo.toFixed(digits);$('#'+id+'-range-max').textContent=hi.toFixed(digits);$('#'+id+'-direction-value').textContent='±'+env[id+'DirectionVariation']+'°';
  const max=+$('#'+id).max;$('#'+id+'-band').style.setProperty('--low',lo/max*100+'%');$('#'+id+'-band').style.setProperty('--high',hi/max*100+'%');
 }
 env.waveHeight=+$('#waves').value;env.waveDirection=+$('#wave-dir').value;
 for(const [key,id]of [['autoWaves','auto-waves'],['spatialEffects','spatial-effects'],['traffic','traffic'],['hydroInteractions','hydro-interactions'],['towEffects','tow-effects'],['windVisuals','wind-visuals'],['windSound','wind-sound'],['navigationMarks','navigation-marks']])env[key]=$('#'+id).checked;
 env.gusts=false;$('#waves').disabled=env.autoWaves;
}
for(const id of ['wind','wind-min','current','current-min','wind-dir','current-dir','wind-dir-variation','current-dir-variation','waves','wave-dir','auto-waves','spatial-effects','traffic','hydro-interactions','tow-effects','wind-visuals','wind-sound','navigation-marks'])$('#'+id).oninput=()=>{
 for(const name of ['wind','current']){const min=$('#'+name+'-min'),max=$('#'+name);if(+min.value>+max.value){if(id===name+'-min')max.value=min.value;else min.value=max.value;}}
 if(!['spatial-effects','traffic','hydro-interactions','tow-effects','wind-visuals','wind-sound','navigation-marks'].includes(id))$('#preset').value='custom';readEnv();
};
for(const btn of document.querySelectorAll('[data-steady]'))btn.onclick=()=>{$('#'+btn.dataset.steady+'-min').value=$('#'+btn.dataset.steady).value;$('#preset').value='custom';readEnv();};
$('#preset').onchange=e=>{
 const p=({calm:[0,0,90,0,0,90,0,0],crosswind:[6,6,270,0,0,90,0,0],river:[2,2,90,.6,.6,180,0,0],gusty:[5,11,225,.15,.35,90,30,15]})[e.target.value];if(!p)return;
 ['wind-min','wind','wind-dir','current-min','current','current-dir','wind-dir-variation','current-dir-variation'].forEach((id,i)=>$('#'+id).value=p[i]);$('#wave-dir').value=p[2];readEnv();
};
function syncEngineType(){const allowed=dieselAvailable($('#craft').value,$('#propulsion').value),select=$('#engine-type');select.querySelector('[value=diesel]').disabled=!allowed;if(!allowed)select.value='petrol';select.disabled=!allowed;}
$('#propulsion').addEventListener('change',syncEngineType);
$('#craft').onchange=()=>{const p=CRAFTS[$('#craft').value];for(const [id,k]of [['boat-length','length'],['boat-beam','beam'],['boat-mass','hullMass']])$('#'+id).value=p[k];$('#fuel-capacity').max=p.fuel;$('#fuel-capacity').value=p.fuel*.75;$('#fuel-capacity-info').textContent='Zbiornik '+p.fuel+' l';for(const id of ['power-left','power-right']){$('#'+id).max=p.maxHp;$('#'+id).value=p.hp;}const drive=$('#propulsion');for(const option of drive.options)option.hidden=option.disabled=!p.propulsions.includes(option.value);drive.disabled=p.propulsions.length===1;if(!p.propulsions.includes(drive.value))drive.value=p.propulsions[0];$('#crew-count').value=p.jet?1:2;$('#equipment-mass').value=p.jet?5:25;$('#engine-count').disabled=!!(p.jet||p.air||p.fixedEngineCount);$('#engine-count').value=String(p.fixedEngineCount??(p.jet||p.air?1:1));$('#power-right-wrap').hidden=$('#engine-count').value!=='2';for(const id of ['bow-thruster','stern-thruster']){$('#'+id).disabled=!!(p.jet||p.air);$('#'+id).checked=!!(id==='bow-thruster'?p.defaultBow:p.defaultStern);}syncEngineType();};
$('#engine-count').onchange=()=>$('#power-right-wrap').hidden=$('#engine-count').value!=='2';
$('#craft').onchange();
function applyCraft(){for(const id of ['crew-count','equipment-mass','fuel-capacity','boat-length','boat-beam','boat-mass','power-left',...($('#engine-count').value==='2'?['power-right']:[])])if(!$('#'+id).reportValidity())return false;boatOptions={coldStart:true,profile:$('#craft').value,length:+$('#boat-length').value,beam:+$('#boat-beam').value,hullMass:+$('#boat-mass').value,engineCount:+$('#engine-count').value,powers:[+$('#power-left').value,+$('#power-right').value],initialFuelLitres:+$('#fuel-capacity').value,crewCount:+$('#crew-count').value,equipmentMass:+$('#equipment-mass').value,propulsion:$('#propulsion').value,engineType:$('#engine-type').value,tankCount:+$('#tank-count').value,bowThruster:$('#bow-thruster').checked,sternThruster:$('#stern-thruster').checked};reset();return true;}
const startDescriptions={euzebia:'Wyspa Euzebia przy ujściu Rządzy · łagodne plaże, drzewa do cumowania. Większe łodzie zostaw na głębszej wodzie.',pilawa:'Wąski Port Pilawa · wejście przy północnym końcu zakrzywionej osłony. Stacja paliw jest osobno, w Porcie Nieporęt.',nieporet:'Port Nieporęt · większy basen na wschód od ujścia kanału, pomosty i wodna stacja ORLEN przy zachodnim brzegu.',zeranski:'Ujście Kanału Żerańskiego · most drogowy przy ul. Zegrzyńskiej, dalej na południe osobny most kolejowy.',trailer:'SUV z łodzią na przyczepie, na parkingu. Cofnij z korektami kierownicą na slip i zwoduj łódź.',retrieve:'Łódź na wodzie. Pusta przyczepa czeka na slipie — dopłyń między prowadnice i przywiąż dziób do PRZ.',lake:'Otwarta woda do prób prędkości, ślizgu i zakrętów.',approach:'Podejście do portu.',berth:'Pomiędzy pomostami, blisko polerów.',beach:'Dzika Plaża w Nieporęcie · płytki piasek i cumowanie do drzewa.',island:'Wysepki przy ujściu Bugu · mielizny i spokojna woda.',canal:'Zatoka Rządzy · wąskie wejście do ćwiczeń manewrowych.',fuel:'Pomost paliwowy po stronie Ryni, naprzeciw głównego portu.',service:'Pomost techniczny przy budynku serwisu, na wschód od slipu. Przycumuj i wyłącz zapłon.',harbor:'Przed stanowiskami z bojami i Y-bomami.'};
$('#start-location').onchange=()=>{start=$('#start-location').value;$('#start-description').textContent=startDescriptions[start];};
function restoreWeather(){$('#setup-weather').append($('#environment-panel'));}
function closeWeather(){$('#weather-picker').hidden=true;restoreWeather();}
function openSetup(){if(sessionReady){saveGame();try{const current=readAutosave(localStorage);if(current.ok){$('#continue-session').hidden=false;$('#continue-session').onclick=()=>continueSession(current);$('#resume-info').textContent='Bieżący zapis · '+new Date(current.session.savedAt).toLocaleTimeString('pl-PL')+' · powrót w pauzie';}}catch{}}restoreHistory?.refresh();releaseRopeControls();keys.clear();blockedGas.clear();towApi.clearCarPedals();cockpitApi.holds.bow=cockpitApi.holds.stern=0;closeWeather();$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;$('#start-location').value=start;$('#start-description').textContent=startDescriptions[start];if(!$('#setup-dialog').open)$('#setup-dialog').showModal();}
function finishSetup(){start=$('#start-location').value;if(!applyCraft())return;$('#setup-dialog').close();sessionReady=true;$('#continue-session').hidden=true;last=performance.now();accumulator=0;saveGame();}
$('#open-settings').onclick=openSetup;$('#begin-session').onclick=finishSetup;
$('#setup-close').onclick=()=>$('#setup-dialog').close();$('#setup-dialog').addEventListener('cancel',()=>{keys.clear();});
$('#weather-open').onclick=()=>{if(!$('#weather-picker').hidden){closeWeather();return;}$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;$('#weather-content').append($('#environment-panel'));$('#weather-picker').hidden=false;};
$('#close-weather').onclick=closeWeather;draggablePopup($('#weather-picker'),$('#weather-handle'));
function towAt(end){return fleet.tows.find(r=>!r.broken&&(r.from===boat.id&&r.fromEnd===end||r.to===boat.id&&r.toEnd===end));}
function lineAt(end){return boat.ropes.find(r=>r.end===end)??towAt(end);}
function targetName(t){if(typeof t!=='object'||t===null)return BOLLARDS[t]?.label??'Wybierz punkt';const b=fleet.boats.find(q=>q.id===t.boatId);return b?fleetName(b)+' · '+attachmentNames(b)[t.end]:'Brak jednostki';}
function lineInfo(r){if(!r.from)return ropeInfo(r);const id=r.from===boat.id?r.to:r.from,end=r.from===boat.id?r.toEnd:r.fromEnd;return targetName({boatId:id,end})+' · '+r.length.toFixed(2)+' m · '+(r.tension/1000).toFixed(2)+' kN';}
function ropeSignature(){return boat.id+'|'+boat.ropes.map(r=>r.end).join(',')+'|'+fleet.tows.filter(r=>!r.broken&&(r.from===boat.id||r.to===boat.id)).map(r=>r.id).join(',');}
function attachSelected(end,target){if(typeof target==='object'&&target!==null)return connectBoatPoints(fleet,boat.id,end,target.boatId,target.end);if(towAt(end))return{ok:false,message:'Ta knaga ma już hol.'};return attachRope(boat,end,target);}
function openMooring(target){const wasClosed=$('#mooring-picker').hidden;closeWeather();selectedTarget=target;$('#anchor-picker').hidden=true;renderMapRopes();$('#mooring-picker').hidden=false;if(wasClosed){draw();const bx=width/2+(boat.x-view.camera.x)*view.scale,by=height/2+(boat.y-view.camera.y)*view.scale,radius=(Math.abs(Math.cos(boat.a))*boat.spec.length+Math.abs(Math.sin(boat.a))*boat.spec.beam)*view.scale/2;mooringPopup.beside(bx,by,radius);}}
function shortLineInfo(r){return compactLineText(r,r.from?targetName({boatId:r.from===boat.id?r.to:r.from,end:r.from===boat.id?r.toEnd:r.fromEnd}):BOLLARDS[r.bollard].id);}
function ropeInfo(r){return `${BOLLARDS[r.bollard].id} · ${r.length.toFixed(2)} m · ${(r.tension/1000).toFixed(2)} kN${r.control<0?` · ${r.gearRatio>1?'kabestan':'ręka'} ${Math.round(r.manualForce??0)} N${r.blocked?' · za ciężko':' · wybieranie'}`:r.control>0?' · luzowanie':''}`;}
function loadMarkup(end,map=false){return `<span class="rope-load" id="${map?'map-':''}load-${end}"><meter min="0" max="100" value="0" aria-label="Obciążenie cumy ${attachmentNames(boat)[end]??end}"></meter><small></small></span>`;}
function ropeActions(end,r){return r?`<button data-rope="${end}" data-action="shorten" aria-label="Wybierz cumę ${attachmentNames(boat)[end]??end}">−</button><button data-rope="${end}" data-action="loosen" aria-label="Poluzuj cumę ${attachmentNames(boat)[end]??end}">+</button><button data-rope="${end}" data-action="detach" aria-label="Odczep cumę ${attachmentNames(boat)[end]??end}">×</button>`:`<button data-rope="${end}" data-action="attach" aria-label="Załóż cumę ${attachmentNames(boat)[end]??end}">+</button>`;}
let renderedRopeSignature='';
function renderRopes(){renderedRopeSignature=ropeSignature();renderMapRopes();}
const cleatIcon='<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M4 8h24M10 8l3 10h6l3-10M10 20h12" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
function renderMapRopes(){
 if(selectedTarget===null)return;
 $('#mooring-target').textContent=targetName(selectedTarget);$('#map-ropes').dataset.kind=boat.fleetKind??'boat';
 const gear=mooringGear(boat.spec,boat.mooringAssist);$('#mooring-haul-mode').value=gear.ratio>1?'4':'1';$('#mooring-haul-option').hidden=!gear.available;$('#mooring-gear-info').textContent=`Cuma Ø ${gear.diameter} mm · zerwanie ${(gear.strength/1000).toFixed(0)} kN${gear.ratio>1?' · kabestan 4:1':''}`;
 $('#map-ropes').innerHTML=mooringDiagram(attachmentNames(boat),lineAt,{icon:cleatIcon,lineText:shortLineInfo,lineTitle:lineInfo,load:end=>loadMarkup(end,true),actions:ropeActions,tone:r=>ropeLoadState(r,r.from?{...boat.spec,lineBreak:r.strength}:boat.spec).tone});
}
function ropeAction(btn){const end=btn.dataset.rope,r=lineAt(end);switch(btn.dataset.action){case'attach':{toast(attachSelected(end,selectedTarget).message);break;}case'detach':if(r?.from)fleet.tows=fleet.tows.filter(q=>q!==r);else boat.ropes=boat.ropes.filter(q=>q.end!==end);break;case'shorten':case'loosen':return;}renderRopes();}
const ropePointers=new Map();
function releaseRopeControls(){for(const r of [...boat.ropes,...fleet.tows])requestHaul(r,0);ropePointers.clear();}
for(const id of ['map-ropes']){
 const host=$('#'+id);
 const startHold=(btn,key)=>{const r=lineAt(btn.dataset.rope);if(r){requestHaul(r,btn.dataset.action==='shorten'?-1:1);ropePointers.set(key,r);}};
 const stopHold=key=>{const r=ropePointers.get(key);if(r){requestHaul(r,0);ropePointers.delete(key);}};
 host.addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-action=shorten],[data-action=loosen]');if(!btn||e.button!==0)return;e.preventDefault();btn.setPointerCapture(e.pointerId);startHold(btn,e.pointerId);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])host.addEventListener(event,e=>stopHold(e.pointerId));
 host.addEventListener('keydown',e=>{const btn=e.target.closest('[data-action=shorten],[data-action=loosen]');if(btn&&[' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();if(!e.repeat)startHold(btn,'keyboard');}});
 host.addEventListener('keyup',e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();e.stopPropagation();stopHold('keyboard');}});
}
window.addEventListener('blur',releaseRopeControls);document.addEventListener('visibilitychange',releaseRopeControls);
$('#map-ropes').onclick=e=>{const choice=e.target.closest('[data-cleat]'),action=e.target.closest('[data-rope]');if(choice){toast(attachSelected(choice.dataset.cleat,selectedTarget).message);renderRopes();}else if(action)ropeAction(action);};
$('#map-ropes').insertAdjacentHTML('beforebegin','<div class="mooring-gear"><small id="mooring-gear-info"></small><label id="mooring-haul-option" title="Tryb wybierania cum do polerów, boi, drzew i przyczepy">Cumy <select id="mooring-haul-mode" aria-label="Sposób wybierania cum do punktów mapy"><option value="1">Ręcznie</option><option value="4">Kabestan 4:1</option></select></label></div>');
$('#mooring-haul-mode').onchange=e=>{releaseRopeControls();boat.mooringAssist=e.target.value==='4';renderRopes();};
const mooringPopup=draggablePopup($('#mooring-picker'),$('#mooring-handle'));
draggablePopup($('#anchor-picker'),$('#anchor-handle'));
$('#close-mooring').onclick=()=>{releaseRopeControls();$('#mooring-picker').hidden=true;};$('#close-anchor').onclick=()=>$('#anchor-picker').hidden=true;
function showAnchor(){closeWeather();$('#mooring-picker').hidden=true;$('#anchor-picker').hidden=false;$('#anchor-picker').scrollIntoView({block:'nearest'});}
$('#show-anchor').onclick=showAnchor;
$('#show-mooring').onclick=()=>{let target=selectedTarget??boat.ropes[0]?.bollard;if(target==null){let distance=Infinity;for(let i=0;i<BOLLARDS.length;i++){const p=mooringPoint(boat,i),d=Math.hypot(p.x-boat.x,p.y-boat.y);if(d<distance&&!p.trailer){distance=d;target=i;}}}if(target!=null)openMooring(target);};
for(const id of ['anchor-suggest'])$('#'+id).onclick=()=>{const advice=anchorAdvice(boat,env);$('#anchor-target').value=advice.length;};
for(const btn of document.querySelectorAll('[data-anchor]'))btn.onclick=()=>{const input=$('#anchor-target');if(!input.reportValidity())return;toast(anchorCommand(boat,btn.dataset.anchor,+input.value).message);};
function mapZoom(factor){if(overview)zoomAtlas(atlas,factor,width/2,height/2,width,height);else zoom=clamp(zoom*factor,.16,3);}
$('#zoom-in').onclick=()=>mapZoom(1.25);$('#zoom-out').onclick=()=>mapZoom(1/1.25);$('#follow').onclick=centerBoat;
$('#overview').onclick=()=>{npcMooring.close();overview=true;atlas=createAtlas();$('#mooring-picker').hidden=$('#anchor-picker').hidden=true;closeWeather();};
$('.water-wrap').insertAdjacentHTML('beforeend','<div id="atlas-tools" hidden><button id="atlas-fit">Cały akwen</button><button id="atlas-boat">◎ Do łodzi</button><small>Przesuń · kółko / dwa palce: zoom · kliknij nazwę</small></div>');
$('#atlas-fit').onclick=()=>atlas=createAtlas();$('#atlas-boat').onclick=()=>{if(vehicle==='boat')centerBoat();else{overview=false;follow=false;manualCenter={x:boat.x,y:boat.y};}};
$('#trail-toggle').onclick=()=>{showTrail=!showTrail;$('#trail-toggle').setAttribute('aria-pressed',showTrail);};let showTrail=true;
const npcMooring=installTrafficMooring({world:()=>boat,release:()=>releaseAllHolds(),toast,save:saveGame});
const canvas=$('#lake'),ctx=canvas.getContext('2d');let width=1,height=1,minimapView=null,minimapAt=-Infinity,minimapBoat=null;
installMapGestures(canvas,{active:()=>overview&&!pendingPlacement,size:()=>({width,height}),atlas:()=>atlas,labels:()=>view?.labels??[],focus:q=>{overview=false;follow=false;manualCenter={x:q.worldX,y:q.worldY};zoom=1/(boat.cameraZoom||1);}});
new ResizeObserver(()=>{const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(devicePixelRatio,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}).observe(canvas);
function draw(){canvas.classList.toggle('atlas-mode',overview);$('#atlas-tools').hidden=!overview;$('#overview').setAttribute('aria-pressed',String(overview));$('.sonar').hidden=overview||!$('#sonar-toggle').checked||!boat.electrics.powered.sonar;$('#minimap').hidden=overview;const screenShift=!$('#mooring-picker').hidden&&width<650&&!overview?Math.max(0,width/2-(width<360?24:48)):0;view=renderWorld(ctx,{boat,env,width,height,zoom,follow,overview,atlasView:overview?atlasProjection(atlas,width,height):null,manualCenter,centerReference,screenShift,selected:selectedTarget,trail,showTrail,focus:vehicle==='suv'?towRig.car:null,towRig,rigBoat:rigBoat(fleet),fleet,vehicle});if(!overview&&(minimapBoat!==boat||performance.now()-minimapAt>=100)){minimapView=renderMinimap($('#minimap'),boat,view);minimapAt=performance.now();minimapBoat=boat;}const q=boat,px=width/2+(q.x-view.camera.x)*view.scale,py=height/2+(q.y-view.camera.y)*view.scale;serviceMap.hidden=overview||!nearService(boat)||px<0||px>width||py<0||py>height;if(!serviceMap.hidden){serviceMap.style.left=clamp(px+15,8,width-165)+'px';serviceMap.style.top=clamp(py+20,145,height-55)+'px';}}
canvas.onclick=e=>{
 if(!view||overview&&!pendingPlacement)return;const rect=canvas.getBoundingClientRect(),p={x:(e.clientX-rect.left-width/2)/view.scale+view.camera.x,y:(e.clientY-rect.top-height/2)/view.scale+view.camera.y};
 if(pendingPlacement){e.preventDefault();e.stopPropagation();const result=spawnFleetCraft(fleet,pendingPlacement.kind,{...p,a:pendingPlacement.a},{...pendingPlacement.options,traffic:env.traffic});toast(result.message);if(result.ok){pendingPlacement=null;$('#placement-help').hidden=true;fleetUI.refresh();saveGame();}return;}
 const ambient=env.traffic?trafficAt(boat.traffic,p):null;if(ambient){npcMooring.open(ambient,(e.clientX-rect.left),(e.clientY-rect.top));return;}
 let boatPoint=null,pointDistance=Math.max(.35,10/view.scale);
 for(const b of fleet.boats)if(b!==boat)for(const end of Object.keys(attachmentNames(b))){const q=cleat(b,end),dist=Math.hypot(p.x-q.x,p.y-q.y);if(dist<pointDistance){pointDistance=dist;boatPoint={boatId:b.id,end};}}
 if(boatPoint){openMooring(boatPoint);return;}
 let best=-1,d=Math.max(.8,12/view.scale);BOLLARDS.forEach((_,i)=>{const q=mooringPoint(boat,i),dist=Math.hypot(p.x-q.x,p.y-q.y);if(dist<d){best=i;d=dist;}});
 const station=FUEL_STATIONS.find(q=>Math.hypot(p.x-q.pumpX,p.y-q.pumpY)<Math.min(d,Math.max(1,14/view.scale)));if(station){screenUI.openFuel(station);return;}
 if(best>=0&&npcMooring.target(best))return;
 const bow=cleat(boat,'bow'),bowDistance=Math.hypot(p.x-bow.x,p.y-bow.y);
 if(bowDistance<Math.max(boat.spec.length*.15,13/view.scale)&&(best<0||bowDistance<d)){showAnchor();return;}
 if(best>=0)openMooring(best);
};
$('#minimap').onclick=e=>{const r=e.target.getBoundingClientRect();if(!minimapView)return;const fit=minimapView;manualCenter={x:clamp(fit.left+(e.clientX-r.left)*e.target.width/r.width/fit.scale,WORLD.left,WORLD.right),y:clamp(fit.top+(e.clientY-r.top)*e.target.height/r.height/fit.scale,WORLD.top,WORLD.bottom)};follow=false;overview=false;};
const sonarCanvas=$('#sonar'),sonarCtx=sonarCanvas.getContext('2d'),anchorCanvas=$('#anchor-profile'),anchorCtx=anchorCanvas.getContext('2d');
function drawSonar(){
 const c=sonarCtx,w=sonarCanvas.width,h=sonarCanvas.height,chartHeight=h-25;c.clearRect(0,0,w,h);c.fillStyle='#183e3c';c.fillRect(0,0,w,h);
 c.strokeStyle='#345852';c.lineWidth=1;c.font='12px system-ui';c.fillStyle='#749a87';
 for(let depth=2;depth<=8;depth+=2){const y=depth/8*chartHeight;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();c.fillText(depth+' m',5,y-4);}
 if(sonarHistory.length){const offset=w-sonarHistory.length*w/240;
 c.beginPath();c.moveTo(offset,h);sonarHistory.forEach((p,i)=>c.lineTo(offset+i*w/240,Math.min(h,p.depth/8*chartHeight)));c.lineTo(w,h);c.closePath();c.fillStyle='#b49b64';c.fill();
 c.beginPath();sonarHistory.forEach((p,i)=>i?c.lineTo(offset+i*w/240,Math.min(h,p.depth/8*chartHeight)):c.moveTo(offset,Math.min(h,p.depth/8*chartHeight)));c.lineWidth=2;c.strokeStyle='#e4ca83';c.stroke();}
 c.fillStyle='#b9d0bd';c.font='11px system-ui';c.fillText('−60 s',6,h-7);
 if(sonarHistory.length>30&&sonarHistory[sonarHistory.length-1].depth>2&&Math.sin(boat.x*.07+boat.y*.11)>.35){for(let i=0;i<3;i++){const x=w-50-i*45,y=65+i*23;c.strokeStyle='#e4b768';c.beginPath();c.arc(x,y,8,Math.PI,0);c.stroke();}c.fillStyle='#c3d8ae';c.fillText('‹ ryby ›',w-80,h-35);}c.fillText('teraz',w-40,15);
}
function drawAnchorProfile(){
 const c=anchorCtx,w=anchorCanvas.width,h=anchorCanvas.height,a=boat.anchor;
 c.fillStyle='#edf3e9';c.fillRect(0,0,w,h);c.fillStyle='#d5dfc9';c.fillRect(0,h-26,w,26);c.fillStyle='#8a9b7e';c.font='12px system-ui';
 if(a.mode==='stowed'||a.broken){c.fillText(a.broken?'Utracona kotwica':'Profil rode po opuszczeniu kotwicy',20,h/2);return;}
 const p=cleat(boat,'bow'),d=Math.hypot(p.x-a.x,p.y-a.y),floorDepth=Math.max(0,bottomAt(a.x,a.y).depth),height=Math.max(.4,floorDepth+.65+boat.heave),anchorAbove=Math.max(0,floorDepth-a.z);
 const maxX=Math.max(4,d,a.shape?.x??d),sx=(w-65)/maxX,sz=(h-50)/Math.max(2,height);
 const X=x=>25+x*sx,Z=z=>h-27-z*sz;
 const profile=a.z>=bottomAt(a.x,a.y).depth-.02?anchorProfile(a,boat):[{x:0,z:anchorAbove,chain:true},{x:d,z:height,chain:a.length<=a.chainReserve}];
 for(let i=1;i<profile.length;i++){c.beginPath();c.moveTo(X(profile[i-1].x),Z(profile[i-1].z));c.lineTo(X(profile[i].x),Z(profile[i].z));c.strokeStyle=profile[i].chain?'#657a79':'#b28c48';c.lineWidth=3;c.stroke();}
 c.fillStyle='#45605c';c.fillText('⚓',X(0)-5,Z(anchorAbove)+2);c.fillText('dziobowa rolka',Math.max(28,Math.min(w-100,X(d)-35)),Math.max(14,Z(height)-9));
 c.strokeStyle='#769c94';c.setLineDash([4,5]);const sea=Z(floorDepth);c.beginPath();c.moveTo(0,sea);c.lineTo(w,sea);c.stroke();c.setLineDash([]);
 c.fillStyle='#788b73';c.font='11px system-ui';c.fillText('łańcuch: szary · lina: złota · skale osi różne',20,h-9);
}
function telemetry(){
 const e=environment(boat.time,env,boat.x,boat.y),S=boat.spec;
 $('#speed').innerHTML=`${(Math.hypot(boat.vx,boat.vy)*(speedUnit==='kn'?1.94384:3.6)).toFixed(1)} <small>${speedUnit}</small>`;$('#water-speed').innerHTML=`${(Math.hypot(boat.vx-e.current.x,boat.vy-e.current.y)*(speedUnit==='kn'?1.94384:3.6)).toFixed(1)} <small>${speedUnit}</small>`;$('#heading').textContent=Math.round(((boat.a*180/Math.PI+90)%360+360)%360)%360+'°';$('#yaw').innerHTML=`${(boat.w*180/Math.PI).toFixed(1)} <small>°/s</small>`;
 $('#tension').textContent=(boat.maxTension/1000).toFixed(2)+' kN';
 for(const [id,damage]of [['hull',boat.damage],['dock',boat.dockDamage]]){$('#'+id+'-value').textContent=(damage>0&&damage<1?(100-damage).toFixed(1):Math.round(100-damage))+'%';$('#'+id+'-bar').style.width=(100-damage)+'%';}
 const worstDamage=Math.max(boat.damage,...boat.engines.map(en=>en.propDamage));$('#condition-tag').textContent=boat.sunken?'ZATOPIONA':boat.swamped?'ZALANA':boat.damage>=100?'ZNISZCZONY KADŁUB':boat.grounded?'NA MIELIŹNIE':boat.damage>0?'USZKODZENIA KADŁUBA':worstDamage>0?'USZKODZENIA NAPĘDU':'BEZ USZKODZEŃ';$('#condition-tag').classList.toggle('danger',boat.swamped||boat.sunken||worstDamage>=35);$('#condition-tag').classList.toggle('warning',worstDamage<35&&(worstDamage>0||boat.grounded));
 if(renderedRopeSignature!==ropeSignature())renderRopes();
 for(const r of boat.ropes){const icon=$('.diagram-cleat.cleat-'+r.end);if(icon)icon.dataset.load=ropeLoadState(r,S).tone;const span=$('#map-rope-'+r.end);if(span){span.textContent=shortLineInfo(r);span.title=ropeInfo(r);}const state=ropeLoadState(r,S);for(const id of ['map-load-']){const el=$('#'+id+r.end);if(el){el.dataset.load=state.tone;el.title=state.title;el.querySelector('meter').value=state.percent;el.querySelector('small').textContent=state.label+' · '+state.percent+'%';}}}
 for(const end of Object.keys(attachmentNames(boat))){const r=towAt(end);if(!r)continue;const icon=$('.diagram-cleat.cleat-'+end);if(icon)icon.dataset.load=ropeLoadState(r,{...S,lineBreak:r.strength}).tone;for(const prefix of ['map-rope-']){const el=$('#'+prefix+end);if(el){el.textContent=shortLineInfo(r);el.title=lineInfo(r);}}for(const prefix of ['map-load-']){const el=$('#'+prefix+end);if(el){el.querySelector('meter').value=100*r.tension/r.strength;el.querySelector('small').textContent=(r.tension/1000).toFixed(2)+' / '+(r.strength/1000).toFixed(1)+' kN';}}}
 if(boat.events.length&&boat.events[0]!==lastEvent){lastEvent=boat.events[0];toast(lastEvent.message);}
 $('#engine-state').textContent=boat.engines.map((en,i)=>`${boat.engines.length===2?(i?'P: ':'L: '):''}${Math.round(en.rpm)} obr/min · ${Math.round(en.thrust)} N · ${Math.round(en.temperature)}°C`).join(' / ');
 if(S.passive)$('#engine-state').textContent=S.manual?'Napęd ręczny · do 85 W średniej mocy':'Jednostka bez napędu · holowanie i cumowanie';
 const transducer=point(boat,-S.length*.30,0),bottom=bottomAt(transducer.x,transducer.y),depth=Math.max(0,bottom.depth+waveAt(transducer.x,transducer.y,boat.time,env).eta);
 $('#depth').innerHTML=`${depth.toFixed(2)} <small>m</small>`;$('#keel').textContent=`Stępka ${boat.underKeel.toFixed(2)} m`;$('#keel').classList.toggle('danger',boat.underKeel<.3);$('#bottom-material').textContent=bottom.name;
 $('#roll').textContent=(boat.roll*180/Math.PI).toFixed(1)+'°';$('#pitch').textContent=(boat.pitch*180/Math.PI).toFixed(1)+'°';$('#regime').textContent=boat.planing>.65?'Ślizg':boat.planing>.12?'Przejście do ślizgu':'Wypornościowo';$('#wave-value').textContent=waveHeight(env,boat.time).toFixed(2)+' m';const live=weatherAt(boat.time,env);for(const name of ['wind','current'])$('#'+name+'-live').textContent=`Teraz: ${live[name+'Speed'].toFixed(name==='wind'?1:2)} m/s · ${Math.round(live[name+'Direction'])}°`;
 if(boat.electrics.powered.sonar&&(boat.time-sonarTime>=.25||!sonarHistory.length)){sonarHistory.push({depth});if(sonarHistory.length>180)sonarHistory.shift();sonarTime=boat.time;}
 $('#propeller-health').innerHTML=boat.engines.map((en,i)=>`<div class="health-row"><span>${S.air?'Śmigło powietrzne':S.jet?'Wirnik':'Śruba'} ${boat.engines.length===2?(i?'P':'L'):''}</span><strong>${en.propDamage>0&&en.propDamage<1?(100-en.propDamage).toFixed(1):Math.round(100-en.propDamage)}%${en.propContact?' · DNO':''}</strong></div>`).join('');
 const a=boat.anchor;$('#anchor-progress').value=a.length;$('#winch-speed').textContent=Math.abs(a.winchRate??0).toFixed(2)+' m/s';$('#map-anchor-state').classList.toggle('danger',a.broken||a.windlassBlocked);$('#anchor-length').textContent=a.length.toFixed(1)+' m';$('#anchor-scope').textContent=a.mode==='stowed'?'—':(a.length/(bottomAt(a.x,a.y).depth+.65)).toFixed(1)+':1';$('#anchor-tension').textContent=(a.tension/1000).toFixed(2)+' kN';$('#anchor-holding').textContent=(a.capacity/1000).toFixed(2)+' kN';$('#anchor-rode').textContent=`${S.anchorMass} kg · ${Math.min(a.length,a.chainReserve).toFixed(1)} m łańcucha + ${Math.max(0,a.length-a.chainReserve).toFixed(1)} m liny`;
 const advice=anchorAdvice(boat,env),adviceText=`Orientacyjnie ${advice.scope}:1 · ${advice.required} m rode (dno–rolka ${advice.height.toFixed(1)} m)${advice.limited?' · za mały zapas, wybierz płytsze miejsce':''}`;for(const id of ['anchor-advice']){$('#'+id).textContent=adviceText;$('#'+id).classList.toggle('danger',advice.limited);}
 const laidChain=a.shape?.chainLaid??Math.min(a.chainReserve,a.groundLength??0),laidRope=a.shape?.ropeLaid??Math.max(0,(a.groundLength??0)-a.chainReserve);$('#anchor-bottom-info').textContent=`Na dnie: ${laidChain.toFixed(1)} m łańcucha + ${laidRope.toFixed(1)} m liny · zawieszone ${Math.max(0,a.length-laidChain-laidRope).toFixed(1)} m · kotwica ${Math.max(0,a.z).toFixed(1)} m pod wodą`;
 $('#map-anchor-state').textContent=`${a.status} · ${a.length.toFixed(1)} m · ${(a.tension/1000).toFixed(2)} kN`;
 const focus=vehicle==='suv'?towRig.car:boat,localFlow=environment(boat.time,env,focus.x,focus.y),wind=localFlow.wind,windSpeed=Math.hypot(wind.x,wind.y),windHeading=(Math.atan2(wind.x,-wind.y)*180/Math.PI+360)%360,names=['N','NE','E','SE','S','SW','W','NW'];$('#wind-speed').textContent=(windSpeed*(flowUnits.wind==='km/h'?3.6:1)).toFixed(1)+' '+flowUnits.wind;$('#wind-heading').textContent=windSpeed<.05?'cisza':`${Math.round(windHeading)}° → ${names[Math.round(windHeading/45)%8]}`;$('#wind-arrow').style.transform=`rotate(${windHeading}deg)`;$('#wind-indicator').classList.toggle('calm',windSpeed<.05);const current=localFlow.current,currentSpeed=Math.hypot(current.x,current.y),currentHeading=(Math.atan2(current.x,-current.y)*180/Math.PI+360)%360;$('#current-arrow').style.transform=`rotate(${currentHeading}deg)`;$('#current-arrow').style.opacity=currentSpeed<.005?'.25':'1';$('#current-speed').textContent=(currentSpeed*(flowUnits.current==='km/h'?3.6:1)).toFixed(flowUnits.current==='m/s'?2:1)+' '+flowUnits.current;$('#current-heading').textContent=currentSpeed<.005?'cisza':`${Math.round(currentHeading)}° → ${names[Math.round(currentHeading/45)%8]}`;
 $('#wave-height').textContent=waveHeightAt(focus.x,focus.y,boat.time,env,localFlow).toFixed(2)+' m';
 const regions=[{name:'Port główny · slip',x:80,y:15},...REMOTE_HARBORS,...MAP_LABELS,...MAP_POIS.filter(q=>['euzebia','pilawa','nieporet','zeranski'].includes(q.id))],region=regions.reduce((a,q)=>Math.hypot(q.x-focus.x,q.y-focus.y)<Math.hypot(a.x-focus.x,a.y-focus.y)?q:a);$('#region-name').textContent='Okolica: '+region.name;
 const shore=shoreAt(vehicle==='suv'?towRig.car.x:boat.x,vehicle==='suv'?towRig.car.y:boat.y);$('#shore-distance').textContent=Math.max(0,shore.distance).toFixed(0)+' m';
 updateCockpit();updateTowCockpit();if(vehicle==='suv'){$('#speed').innerHTML=`${(Math.hypot(towRig.car.vx,towRig.car.vy)*(speedUnit==='kn'?1.94384:3.6)).toFixed(1)} <small>${speedUnit}</small>`;$('#water-speed').innerHTML='—';$('#heading').textContent=Math.round((towRig.car.a*180/Math.PI+450)%360)+'°';$('#yaw').innerHTML=`${(towRig.car.w*180/Math.PI).toFixed(1)} <small>°/s</small>`;}updateOperations();updatePowerPanel();updateDepot();updateRescue();fleetUI.refresh();if(boat.electrics.powered.sonar)drawSonar();if(!$('#anchor-picker').hidden)drawAnchorProfile();screenUI?.refreshFuel();
}
function frame(now){
 if(now-soundAt>=33){soundAt=now;sound.update(vehicle==='suv'?towAudioBoat(towRig,boat):boat,env,!paused&&!$('#info').open&&!$('#setup-dialog').open&&!$('#fleet-dialog').open&&!($('#logbook-dialog')?.open||$('#navigation-legend')?.open)&&!document.hidden&&document.hasFocus(),{boats:fleet.boats,listener:vehicle==='suv'?towRig.car:boat,listenerId:vehicle==='suv'?'suv':boat.id,rescue:fleet.rescue});$('#sound-status').textContent=({waiting:'Włącz po dotknięciu ekranu',suspended:'Dotknij ekranu, aby włączyć dźwięk',interrupted:'Dotknij ekranu, aby wznowić dźwięk',unsupported:'Dźwięk niedostępny',muted:'Wyciszony'})[sound.state()]??'';$('#sound-toggle').dataset.state=sound.state();
 }
 const dt=Math.min((now-last)/1000,.1);last=now;
 if(!paused&&!document.hidden&&!$('#info').open&&!$('#setup-dialog').open&&!$('#fleet-dialog').open&&!($('#logbook-dialog')?.open||$('#navigation-legend')?.open)){
  const steer=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),gas=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0);
  if(vehicle==='suv'){if(steer)setSteer(towRig.steer+steer*steeringSettings.suv*dt);towRig.gas=Math.max(towApi.carPedals.gas,keys.has('w')||keys.has('arrowup')?1:0);towRig.brake=Math.max(towApi.carPedals.brake,keys.has('s')||keys.has('arrowdown')?1:0);}
  else{if(steer)setSteer(boat.steer+steer*steeringSettings.boat*boat.spec.maxSteer/boat.spec.steeringLockTime*dt);if(gas&&['w','arrowup','s','arrowdown'].some(k=>keys.has(k)&&now-(keyTimes.get(k)??now)>180)){const v=selectedEngine?boat.throttle2:boat.throttle;setThrottle(Math.sign(v)!==gas&&Math.abs(v)<=CREEP+.005?(Math.abs(v)<.035?gas*CREEP:0):v+gas*(boat.spec.racing?2:boat.spec.jet?1.2:.8)*dt);}}
  boat.thrusters.bow=vehicle==='suv'?0:cockpitApi.holds.bow||((keys.has('e')?1:0)-(keys.has('q')?1:0));boat.thrusters.stern=vehicle==='suv'?0:cockpitApi.holds.stern||((keys.has('x')?1:0)-(keys.has('z')?1:0));
  accumulator+=dt;while(accumulator>=1/120){fleetStep(fleet,env,1/120);accumulator-=1/120;}recordFleetTrails(fleet);
 }else accumulator=0;
 if(sessionReady&&now-lastAutosave>=AUTOSAVE_SECONDS*1000)saveGame();
 if(now-telemetryAt>100){telemetry();syncControls();telemetryAt=now;}draw();requestAnimationFrame(frame);
}
$('#info .dialog-body').innerHTML=helpMarkup;
$('.setup-heading').insertAdjacentHTML('afterend','<div class="resume-actions"><button id="continue-session" hidden>▶ Kontynuuj</button><span id="resume-info"></span></div>');
function continueSession(saved){npcMooring.close();
 releaseAllHolds();const s=saved.session;fleet=s.fleet;boat=activeBoat(fleet);towRig=s.towRig??createTowRig(rigBoat(fleet));vehicle=s.vehicle==='suv'?'suv':'boat';if(vehicle==='suv')boat=rigBoat(fleet);fleet.activeId=boat.id;
 start=s.start??'lake';boatOptions=s.boatOptions??{profile:boat.spec.profile,coldStart:true};Object.assign(env,s.env);
 for(const [id,value]of Object.entries(s.weather??{})){const el=$('#'+id);if(el){if(el.type==='checkbox')el.checked=!!value;else el.value=value;}}
 $('#slip-angle').oninput({target:$('#slip-angle')});readEnv();
 if(!(boatOptions.profile in CRAFTS))boatOptions={...boatOptions,profile:rigBoat(fleet).spec.profile};
 const options=boatOptions;$('#craft').value=options.profile;$('#craft').onchange();
 for(const [id,key]of [['boat-length','length'],['boat-beam','beam'],['boat-mass','hullMass'],['engine-count','engineCount'],['fuel-capacity','initialFuelLitres'],['tank-count','tankCount'],['crew-count','crewCount'],['equipment-mass','equipmentMass'],['propulsion','propulsion'],['engine-type','engineType']])if(options[key]!==undefined)$('#'+id).value=options[key];
 for(const [i,id]of ['power-left','power-right'].entries())if(options.powers?.[i])$('#'+id).value=options.powers[i];for(const [id,key]of [['bow-thruster','bowThruster'],['stern-thruster','sternThruster']])$('#'+id).checked=!!options[key];$('#engine-count').onchange();syncEngineType();
 if(options.initialFuelLitres===undefined&&options.fuelCapacity!==undefined)$('#fuel-capacity').value=Math.min(CRAFTS[options.profile].fuel,options.fuelCapacity*.75);
 const u=s.ui??{};zoom=clamp(u.zoom??1,.16,3);follow=u.follow!==false;overview=!!u.overview;manualCenter=u.manualCenter??null;centerReference=u.centerReference??{x:boat.x,y:boat.y};atlas=u.atlas??createAtlas();showTrail=u.showTrail!==false;selectedEngine=Math.min(boat.engines.length-1,u.selectedEngine??0);trail=boat.trail;sonarHistory=u.sonarHistory??[];sonarTime=u.sonarTime??0;
 $('#destination').value=boat.navigationTarget??'';$('#trail-toggle').setAttribute('aria-pressed',showTrail);selectedTarget=null;lastEvent=boat.events[0];paused=true;$('#paused-label').hidden=false;$('#pause').textContent='▷';sessionReady=true;$('#setup-dialog').close();$('#continue-session').hidden=true;last=performance.now();accumulator=0;renderRopes();syncControls();telemetry();toast('Przywrócono lokalny zapis. PAUZA · naciśnij ▷ lub P, aby wznowić.');saveGame();
}
let savedGame;try{savedGame=readAutosave(localStorage);}catch{savedGame={ok:false,message:'Przeglądarka blokuje zapis lokalny.'};}
if(savedGame.ok){$('#continue-session').hidden=false;$('#begin-session').textContent='Rozpocznij nową próbę →';$('#resume-info').textContent=`Zapis ${new Date(savedGame.session.savedAt).toLocaleString('pl-PL')} · ${savedGame.session.fleet.boats.length} jednostek${savedGame.backup?' · odzyskana kopia':''}. Nowa próba zastąpi zapis.`;$('#continue-session').onclick=()=>continueSession(savedGame);}
else if(savedGame.message)$('#resume-info').textContent=savedGame.message;
restoreHistory=installRestoreHistory({restore:continueSession,toast,reference:savedGame?.session?.savedAt});
screenUI=installScreenLayout({boat:()=>boat,save:saveGame});compactPropulsion();
installMapAlerts();readEnv();renderRopes();syncControls();telemetry();requestAnimationFrame(frame);openSetup();
