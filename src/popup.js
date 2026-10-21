// The handle captures one pointer; controls inside the panel retain their normal clicks.
export function draggablePopup(panel,handle){
 let drag=null,placed=false;
 function place(x,y){
  const host=panel.parentElement;
  panel.style.left=Math.max(0,Math.min(x,host.clientWidth-panel.offsetWidth))+'px';
  panel.style.top=Math.max(0,Math.min(y,host.clientHeight-panel.offsetHeight))+'px';
  panel.style.bottom='auto';panel.style.transform='none';placed=true;
 }
 handle.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button'))return;e.preventDefault();
  const box=panel.getBoundingClientRect(),host=panel.parentElement.getBoundingClientRect();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:box.left-host.left,top:box.top-host.top};
  handle.setPointerCapture(e.pointerId);handle.classList.add('dragging');
 });
 handle.addEventListener('pointermove',e=>{if(drag?.id===e.pointerId)place(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);});
 const release=()=>{drag=null;handle.classList.remove('dragging');};
 for(const name of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(name,release);
 handle.addEventListener('keydown',e=>{
  const direction={ArrowLeft:[-12,0],ArrowRight:[12,0],ArrowUp:[0,-12],ArrowDown:[0,12]}[e.key];if(!direction)return;
  e.preventDefault();e.stopPropagation();const box=panel.getBoundingClientRect(),host=panel.parentElement.getBoundingClientRect();place(box.left-host.left+direction[0],box.top-host.top+direction[1]);
 });
 const resize=new ResizeObserver(()=>{if(placed&&!panel.hidden)place(parseFloat(panel.style.left),parseFloat(panel.style.top));});resize.observe(panel.parentElement);resize.observe(panel);
 return{beside(x,y,boatRadius=10){
  const host=panel.parentElement,pad=10,right=x+boatRadius+18;
  // Prefer the right side; on a narrow phone keep the panel on screen below/above
  // the boat instead of forcing it across the middle of the hull.
  const fits=right+panel.offsetWidth<=host.clientWidth-pad;
  place(fits?right:host.clientWidth-panel.offsetWidth-pad,fits?y-panel.offsetHeight*.25:y+boatRadius+18);
 }};
}
