import {ZONES,FENDERS,HULL_SECTIONS,impactPaint} from './impacts.js';
const X=x=>73+x*20,Y=y=>32+y*18;
export function conditionMarkup(){return`<section class="condition-compact" aria-label="Stan jednostki i miejsca kontaktu"><div class="condition-heading"><span>STAN JEDNOSTKI</span><strong id="condition-tag">BEZ USZKODZEŃ</strong></div><svg class="contact-diagram" viewBox="0 0 140 67" role="img" aria-label="Mapa kontaktów i uszkodzeń kadłuba; dziób po prawej"><path d="M128 32Q99 7 18 15V49Q99 57 128 32Z" fill="#f4f6e9" stroke="#819b7e" stroke-width="1"/><path d="M54 22h30v20H54Z" fill="#d0ddca"/>${Object.entries(HULL_SECTIONS).map(([id,points])=>`<path data-contact-zone="${id}" aria-label="${ZONES[id]}" d="M${points.map(([x,y])=>`${X(x)} ${Y(y)}`).join('L')}" fill="none" stroke="#8da786" stroke-width="4" stroke-linecap="round"><title>${ZONES[id]}</title></path>`).join('')}${FENDERS.map(f=>`<rect data-contact-fender="${f.id}" x="${X(f.x*5.5)-4}" y="${Y(f.y*2.1)-3}" width="8" height="6" rx="3" fill="#d5b378" stroke="#a18d62" stroke-width="1"><title>Odbijacz · ${ZONES[f.id]}</title></rect>`).join('')}<text x="125" y="63" text-anchor="end">DZIÓB →</text></svg><div class="contact-legend"><span>● kontakt</span><span>● szkoda</span><span>● silne</span></div><div class="condition-health">${['hull','dock'].map((id,i)=>`<div><div class="health-row"><span>${i?'Pomost':'Kadłub'}</span><strong id="${id}-value">100%</strong></div><div class="health-track"><div id="${id}-bar"></div></div></div>`).join('')}</div><div id="propeller-health"></div><p id="impact-info" aria-live="polite">Bez kontaktu</p><div class="motion-readings"><span>Przechył <b id="roll">0°</b></span><span>Dziób <b id="pitch">0°</b></span><span id="regime">Wypornościowo</span></div></section>`;}
export function updateContactInstrument(b){
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
 document.querySelector('#impact-info').textContent=hit?`${hit.protectedContact?'Odbijacz · ':''}${ZONES[hit.zone]??'Kontakt'} · ${hit.speed.toFixed(2)} m/s · ${Math.round(hit.energy)} J`:'Bez kontaktu';
}
