import {restoreSession} from './session-save.js';
export const HISTORY_KEY='przystan-restore-history-v1',RESTORE_AGES=[30,180,300];
const budget=1_400_000;
export function readRestoreHistory(storage){try{const q=JSON.parse(storage.getItem(HISTORY_KEY));if(q?.version===1&&Array.isArray(q.items)&&q.items.length<=13&&q.items.every(r=>Number.isFinite(r.at)&&r.at>=0&&['gzip','raw'].includes(r.encoding)&&typeof r.data==='string'&&r.data.length<=budget))return q.items;}catch{}return[];}
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);};
export async function packRestorePoint(raw,at){
 if(typeof CompressionStream!=='undefined'){const compressed=await new Response(new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();return{at,encoding:'gzip',data:base64(new Uint8Array(compressed))};}
 return{at,encoding:'raw',data:raw};
}
export async function unpackRestorePoint(record){
 try{let raw=record.data;if(record.encoding==='gzip'){const bytes=Uint8Array.from(atob(record.data),c=>c.charCodeAt(0));raw=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();}return restoreSession(raw);}catch{return{ok:false,message:'Nie można odczytać tego punktu przywracania.'};}
}
export function chooseRestorePoints(items,reference){return RESTORE_AGES.map(age=>({age,record:items.filter(r=>r.at<=reference-age*1000+1500&&r.at>=reference-age*1000-45000).sort((a,b)=>b.at-a.at)[0]??null}));}
export async function appendRestorePoint(storage,raw,at){
 let items=readRestoreHistory(storage);if(items.some(r=>Math.abs(r.at-at)<29000))return{ok:true,items};
 const record=await packRestorePoint(raw,at);items=[...items,record].sort((a,b)=>a.at-b.at).slice(-13);
 const protectedTimes=new Set([at,...chooseRestorePoints(items,at).map(q=>q.record?.at)]);
 const encoded=()=>JSON.stringify({version:1,items});
 while(encoded().length>budget&&items.some(r=>!protectedTimes.has(r.at)))items.splice(items.findIndex(r=>!protectedTimes.has(r.at)),1);
 while(encoded().length>budget&&items.length>1)items.shift();if(encoded().length>budget)return{ok:false,items:readRestoreHistory(storage)};
 try{storage.setItem(HISTORY_KEY,encoded());return{ok:true,items};}catch{
  items=items.filter(r=>protectedTimes.has(r.at));try{storage.setItem(HISTORY_KEY,encoded());return{ok:true,items};}catch{return{ok:false,items:readRestoreHistory(storage)};}
 }
}
export function installRestoreHistory({restore,toast,reference}){
 const host=document.createElement('div');host.id='restore-points';host.innerHTML='<span>Punkty przywracania</span><div></div><small></small>';document.querySelector('.resume-actions').append(host);let queue=Promise.resolve(),lastReference=reference??Date.now();
 function refresh(){let items=[];try{items=readRestoreHistory(localStorage);}catch{}host.querySelector('div').replaceChildren(...chooseRestorePoints(items,lastReference).map(({age,record})=>{const b=document.createElement('button');b.textContent=age===30?'↶ 30 s':`↶ ${age/60} min`;b.disabled=!record;b.dataset.restoreAge=String(age);b.title=record?'Zapis '+new Date(record.at).toLocaleTimeString('pl-PL')+' · '+Math.round((lastReference-record.at)/1000)+' s przed ostatnim zapisem':'Brak dostatecznie starego zapisu';b.onclick=async()=>{b.disabled=true;const r=await unpackRestorePoint(record);if(r.ok)restore(r);else toast(r.message);refresh();};return b;}));}
 refresh();return{refresh,record(raw,at){lastReference=at;queue=queue.then(async()=>{try{const r=await appendRestorePoint(localStorage,raw,at);host.querySelector('small').textContent=r.ok?'Zapis lokalny · odstępy względem ostatniego stanu':'Brak miejsca na dodatkowe punkty; główny zapis zachowany.';}catch{host.querySelector('small').textContent='Punkty przywracania niedostępne; główny zapis zachowany.';}refresh();});return queue;}};
}
