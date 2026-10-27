import {clamp} from './world.js';
export function ropeLoadState(r,S){
 const fraction=clamp(r.tension/S.lineBreak,0,1),percent=Math.round(fraction*100);
 const tone=r.tension<1?'slack':fraction>=.8?'danger':fraction>=.2?'loaded':'taut';
 const label=r.tension<1?'Za luźna':fraction>=.8?'Granica zerwania':fraction>=.2?'Za ciasna':'OK do cumowania';
 return{percent,tone,label,title:`${label} · ${(r.tension/1000).toFixed(2)} kN · ${percent}% siły zrywającej${r.blocked?(r.gearRatio>1?' · przekroczony uciąg kabestanu':' · za ciężko do wybierania ręką'):''}`};
}
