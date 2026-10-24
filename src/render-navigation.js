import {NAV_MARKS,waveAt} from './world.js';
import {markPose} from './navigation-marks.js';
export function drawNavigation(ctx,b,env,visible,scale){
 if(env.navigationMarks===false)return;
 for(const mark of NAV_MARKS){if(!visible(mark.x,mark.y,2))continue;const pose=markPose(mark,b.time,scale>1?waveAt(mark.x,mark.y,b.time,env):undefined),size=Math.max(.5,3/scale);ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.roll);ctx.scale(1+pose.heave*.12,1+pose.heave*.12);
  const cone=(x,y,up,color)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y+(up?-size:size));ctx.lineTo(x-size*.65,y+(up?size*.5:-size*.5));ctx.lineTo(x+size*.65,y+(up?size*.5:-size*.5));ctx.closePath();ctx.fill();};
  ctx.strokeStyle='#344c46';ctx.lineWidth=Math.max(.04,.7/scale);
  if(mark.kind==='green'){cone(0,0,true,'#309261');ctx.stroke();}
  else if(mark.kind==='red'){ctx.fillStyle='#c94e41';ctx.fillRect(-size*.65,-size*.8,size*1.3,size*1.6);ctx.strokeRect(-size*.65,-size*.8,size*1.3,size*1.6);}
  else{const colors=mark.kind==='danger'?['#263932','#c94e41','#263932']:({N:['#263932','#e9c959'],S:['#e9c959','#263932'],E:['#263932','#e9c959','#263932'],W:['#e9c959','#263932','#e9c959']})[mark.cardinal];for(let i=0;i<colors.length;i++){const h=size*1.8/colors.length;ctx.fillStyle=colors[i];ctx.fillRect(-size*.55,-size+i*h,size*1.1,h);}ctx.strokeRect(-size*.55,-size,size*1.1,size*1.8);
   if(mark.kind==='danger'){ctx.fillStyle='#263932';for(const y of [-1.45,-2.2]){ctx.beginPath();ctx.arc(0,y*size,size*.28,0,Math.PI*2);ctx.fill();}}
   else{const up=mark.cardinal==='N'||mark.cardinal==='E',up2=mark.cardinal==='N'||mark.cardinal==='W';cone(0,-size*1.7,up2,'#263932');cone(0,-size*2.8,up,'#263932');}
  }ctx.restore();
 }
}
export function installNavigationLegend(){
 const btn=document.createElement('button');btn.id='navigation-legend-open';btn.textContent='⚑ Znaki';document.querySelector('#logbook-open').after(btn);
 const d=document.createElement('dialog');d.id='navigation-legend';d.innerHTML='<div class="setup-heading"><h2>Tor wodny · IALA A</h2><button class="round" aria-label="Zamknij znaki">×</button></div><p>Kierunek umowny: z jeziora w górę Narwi i Bugu. Zielony stożek po prawej, czerwony walec po lewej.</p><p>Kardynalne wskazują stronę bezpiecznego minięcia: N — dwa stożki w górę, S — w dół, E — podstawami do siebie, W — wierzchołkami do siebie. Kolory czarne i żółte odpowiadają położeniu czarnych stożków.</p><p>Odizolowane niebezpieczeństwo: czarny–czerwony–czarny, dwie czarne kule. Pod znakiem znajduje się fizyczny podwodny głaz. Znaki i tor są treningowe, nie odtwarzają aktualnego oznakowania Zegrza. Widoczność zmienisz w Pogodzie; ukrycie znaków nie usuwa głazów.</p>';document.body.append(d);btn.onclick=()=>d.showModal();d.querySelector('button').onclick=()=>d.close();
}
