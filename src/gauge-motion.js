const states=new WeakMap();
// Display inertia only. No simulated sensor/engine/battery values are modified.
export function setGaugeNeedle(el,fraction,powered,now=performance.now()){
 const previous=states.get(el),until=previous&&previous.powered!==powered?now+1200:previous?.until??0;
 const needle=el.querySelector('.needle');needle.style.transitionDuration=until>now?'1.2s':'.18s';
 needle.style.transform=`rotate(${Math.max(0,Math.min(1,fraction))*180}deg)`;el.dataset.powered=String(!!powered);
 states.set(el,{powered,until});
}
