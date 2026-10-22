import {clamp} from './world.js';
export function ropeLoadState(r,S){
 const fraction=clamp(r.tension/S.lineBreak,0,1),percent=Math.round(fraction*100);
 const tone=r.tension<1?'slack':fraction>=.5?'danger':fraction>=.2?'loaded':'taut';
 const label=r.tension<1?'Luźna':fraction>=.5?'Duże obciążenie':fraction>=.2?'Obciążona':'Napięta';
 return{percent,tone,label,title:`${label} · ${(r.tension/1000).toFixed(2)} kN · ${percent}% siły zrywającej${r.blocked?' · za ciężko do wybierania ręką':''}`};
}
