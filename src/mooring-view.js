const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function compactLineText(r,target){return `${target}\n${r.length.toFixed(2)} m · ${(r.tension/1000).toFixed(2)} kN`;}
export function mooringDiagram(names,lineAt,{icon,lineText,lineTitle,load,actions,tone}){
 return `<div class="mooring-diagram" data-midpoints="${!!names.portMid}"><svg class="mooring-hull" viewBox="0 0 80 190" aria-label="Łódź z góry, dziób u góry"><path d="M40 4Q76 33 73 180H7Q4 33 40 4Z" fill="#dde7d2" stroke="#648165" stroke-width="2"/><path d="M21 62h38v75H21Z" fill="#b2c8ba"/><path d="M28 180h24v9H28Z" fill="#577368"/></svg>${Object.entries(names).map(([end,name])=>{
  const r=lineAt(end);return `<div data-load="${r?tone(r):'slack'}" class="diagram-cleat cleat-${end} ${r?'attached':''}"><button class="cleat-icon" data-cleat="${end}" ${r?'disabled':''} title="${escape(name)}${r?' · '+escape(lineTitle(r)):' · rzuć cumę'}" aria-label="${escape(name)}${r?' · cuma założona':' · rzuć cumę'}">${icon}</button>${r?`<small id="map-rope-${end}" title="${escape(lineTitle(r))}">${escape(lineText(r))}</small>${load(end)}<div class="rope-actions">${actions(end,r)}</div>`:''}</div>`;
 }).join('')}</div>`;
}
