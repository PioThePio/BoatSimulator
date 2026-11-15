// Count completed animation frames over one second. The longest interval helps
// distinguish occasional stutters from a consistently low frame rate.
export function createFpsMeter(element){
 let start=0,previous=0,frames=0,longest=0;
 function reset(){if(!previous&&element.textContent==='FPS —')return;start=previous=frames=longest=0;element.textContent='FPS —';element.classList.remove('slow','uneven');}
 function sample(now){
  if(!previous){start=previous=now;return;}
  longest=Math.max(longest,now-previous);previous=now;frames++;
  if(now-start<1000)return;
  const fps=Math.round(frames*1000/(now-start));
  element.textContent=`FPS ${fps} · ${Math.round(longest)} ms`;
  element.classList.toggle('slow',fps<30);
  element.classList.toggle('uneven',fps>=30&&(fps<50||longest>50));
  start=now;frames=longest=0;
 }
 return{sample,reset};
}
