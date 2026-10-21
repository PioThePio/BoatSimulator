import {ZONES,BOTTOM_ZONES,FENDERS,HULL_SECTIONS,impactPaint,damageColor} from './impacts.js';
const X=x=>73+x*20,Y=y=>32+y*18;
export function conditionMarkup(){return`<section class="condition-compact" aria-label="Stan jednostki i miejsca kontaktu"><div class="condition-heading"><span>STAN JEDNOSTKI</span><strong id="condition-tag">BEZ USZKODZEŃ</strong></div><svg class="contact-diagram" viewBox="0 0 140 67" role="img" aria-label="Mapa kontaktów i uszkodzeń kadłuba; dziób po prawej"><path d="M128 32Q99 7 18 15V49Q99 57 128 32Z" fill="#f4f6e9" stroke="#819b7e" stroke-width="1"/><defs><clipPath id="condition-hull-clip"><path d="M128 32Q99 7 18 15V49Q99 57 128 32Z"/></clipPath></defs><g clip-path="url(#condition-hull-clip)">${[['bottomStern',18,34],['bottomMid',52,35],['bottomBow',87,42]].map(([id,x,w])=>`<rect data-bottom-zone="${id}" x="${x}" y="7" width="${w}" height="50" fill="#e6ebd9"><title>${BOTTOM_ZONES[id]}</title></rect>`).join('')}</g><path d="M54 22h30v20H54Z" fill="none" stroke="#c7d5bd"/>${Object.entries(HULL_SECTIONS).map(([id,points])=>`<path data-contact-zone="${id}" aria-label="${ZONES[id]}" d="M${points.map(([x,y])=>`${X(x)} ${Y(y)}`).join('L')}" fill="none" stroke="#8da786" stroke-width="4" stroke-linecap="round"><title>${ZONES[id]}</title></path>`).join('')}${FENDERS.map(f=>`<rect data-contact-fender="${f.id}" x="${X(f.x*5.5)-4}" y="${Y(f.y*2.1)-3}" width="8" height="6" rx="3" fill="#d5b378" stroke="#a18d62" stroke-width="1"><title>Odbijacz · ${ZONES[f.id]}</title></rect>`).join('')}${[0,1].map(i=>`<g data-contact-engine="${i}"><rect data-engine-body="${i}" x="5" y="27" width="14" height="10" rx="2" fill="#8da786" stroke="#617b64" stroke-width="1"/><circle data-contact-propeller="${i}" cx="4" cy="32" r="3" fill="#8da786" stroke="#617b64" stroke-width="1"/><title></title></g>`).join('')}<text x="125" y="63" text-anchor="end">DZIÓB →</text></svg><div class="contact-legend"><span>● kontakt</span><span>● szkoda</span><span>● silne</span></div><div class="damage-map-key">Obrys: burty · Wnętrze: dno · Tył: napęd</div><div class="condition-health">${['hull','dock'].map((id,i)=>`<div><div class="health-row"><span>${i?'Pomost':'Kadłub'}</span><strong id="${id}-value">100%</strong></div><div class="health-track"><div id="${id}-bar"></div></div></div>`).join('')}</div><div id="propeller-health"></div><p id="impact-info" aria-live="polite">Bez kontaktu</p><div class="motion-readings"><span>Przechył <b id="roll">0°</b></span><span>Dziób <b id="pitch">0°</b></span><span id="regime">Wypornościowo</span></div></section>`;}
export function updateContactInstrument(b){
 for(const id of Object.keys(BOTTOM_ZONES)){const el=document.querySelector(`[data-bottom-zone="${id}"]`),paint=impactPaint(b,id);el.setAttribute('fill',damageColor(paint.damage)??paint.color??'#e6ebd9');el.dataset.damage=String(paint.damage);el.dataset.contact=String(paint.flash>0);el.querySelector('title').textContent=BOTTOM_ZONES[id]+' · '+paint.damage.toFixed(1)+'% uszkodzeń';}
 for(let i=0;i<2;i++){
  const el=document.querySelector(`[data-contact-engine="${i}"]`),en=b.engines[i];el.style.display=en?'':'none';if(!en)continue;
  const y=b.engines.length===1?32:i===0?22:42,body=el.querySelector('rect'),prop=el.querySelector('circle');body.setAttribute('y',y-5);prop.setAttribute('cy',y);
  const color=damageColor(en.propDamage)??'#8da786';prop.setAttribute('fill',color);prop.dataset.damage=String(en.propDamage);body.setAttribute('fill',en.thermalTrip||en.temperature>=105?'#bf6350':en.temperature>=95?'#df9c54':color);
  el.querySelector('title').textContent=`${b.spec.jet?'Wirnik':'Napęd'} ${i+1} · uszkodzenia ${en.propDamage.toFixed(1)}% · ${Math.round(en.temperature)}°C`;
 }

 for(const [selector,fender,items]of [['[data-contact-zone]',false,Object.keys(ZONES)],['[data-contact-fender]',true,FENDERS.map(f=>f.id)]]){
  for(const id of items){
   const el=document.querySelector(`${selector.slice(0,-1)}="${id}"]`),paint=impactPaint(b,id,fender);
   el.setAttribute(fender?'fill':'stroke',paint.color??(fender?'#d5b378':'#8da786'));
   el.setAttribute('opacity',paint.flash>0?(.45+.55*paint.flash).toFixed(2):paint.damage>0?(.45+.55*paint.damage/100).toFixed(2):'1');
   el.dataset.damage=String(Math.round(paint.damage));el.dataset.contact=String(paint.flash>0);
   if(fender)el.style.display=b.fenders?'':'none';
  }
 }
 const hit=b.lastImpact;
 document.querySelector('#impact-info').textContent=hit?`${hit.protectedContact?'Odbijacz · ':''}${ZONES[hit.zone]??BOTTOM_ZONES[hit.zone]??'Kontakt'} · ${hit.speed.toFixed(2)} m/s · ${Math.round(hit.energy)} J`:'Bez kontaktu';
}
