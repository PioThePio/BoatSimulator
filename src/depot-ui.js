import {depotStatus,returnBoat,spareHitchAction} from './trailer-depot.js';
import {rigBoat} from './fleet.js';
export function installDepotUI(api){
 const $=s=>document.querySelector(s),button=document.createElement('button');button.id='depot-return';button.textContent='Zdaj łódź do hangaru';$('.tow-console').append(button);
 button.onclick=()=>{api.release();const result=returnBoat(api.fleet());api.toast(result.message);api.refresh();api.save();};
 $('#trailer-hitch').onclick=()=>{const f=api.fleet(),b=rigBoat(f);api.toast(spareHitchAction(b.towRig,b).message);api.refresh();api.save();};
 return()=>{const f=api.fleet(),b=rigBoat(f),r=b.towRig;button.hidden=api.vehicle()!=='suv'||Math.hypot(r.trailer.x-75,r.trailer.y+64)>25;const status=depotStatus(f);button.disabled=!status.ok;button.title=status.message;};
}
