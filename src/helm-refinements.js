// Reuse existing controls and handlers; only their grouping and captions change.
export function compactPropulsion(){
 const $=s=>document.querySelector(s),bank=$('.engine-bank'),link=$('.engine-link-controls');
 link.title='Sprzęgnij obie manetki · T';link.setAttribute('aria-label','Zepnij manetki');link.querySelector('span').innerHTML='⇄<kbd>T</kbd>';bank.prepend(link);
 const keys=document.createElement('div');keys.className='ignition-bank';for(const i of[0,1])keys.append($('#ignition-'+i));
 const hint=$('.throttle-section>.hint');hint.classList.add('propulsion-shortcuts');keys.append(hint);bank.after(keys);
 for(const id of['bow','stern'])$('#thruster-'+id+'>span').textContent=id==='bow'?'Dziób':'Rufa';
 $('#thruster-panel>small').textContent='Q/E dziób · Z/X rufa · przytrzymaj · zasilanie ON';
}
