import {operationalSeconds} from './operations.js';
export const LOGBOOK_KEY='przystan-logbook-v1';
export const createLogbook=()=>({version:1,enabled:true,totals:{distance:0,hours:0,fuel:0,collisions:0},sessions:[],events:[]});
const number=x=>Number.isFinite(x)?Math.max(0,x):0;
export function captureLogbook(input,fleet,now=Date.now()){
 const book=structuredClone(input);if(!book.enabled||!fleet.logbookId)return book;
 let row=book.sessions.find(q=>q.id===fleet.logbookId);
 if(!row){row={id:fleet.logbookId,date:now,updatedAt:now,duration:0,distance:0,hours:0,fuel:0,collisions:0,maxSpeed:0,last:{},cursors:{}};book.sessions.unshift(row);}
 row.updatedAt=now;row.duration=Math.max(row.duration,operationalSeconds(fleet.time)-(row.durationOffset??0));
 for(const b of fleet.boats){const metrics={distance:number(b.operations?.distance),hours:b.engines.reduce((n,e)=>n+number(e.operatingHours),0),fuel:number(b.operations?.fuelUsed),collisions:number(b.collisionCount)},old=row.last[b.id]??{};
  for(const name of Object.keys(metrics)){const delta=Math.max(0,metrics[name]-number(old[name]));row[name]+=delta;book.totals[name]+=delta;}row.last[b.id]=Object.fromEntries(Object.keys(metrics).map(k=>[k,Math.max(metrics[k],number(old[k]))]));row.maxSpeed=Math.max(row.maxSpeed,number(b.operations?.maxSpeed));
  for(const event of b.logEvents??[])if(event.sequence>(row.cursors[b.id]??0)){book.events.unshift({...event,id:`${row.id}/${b.id}/${event.sequence}`,boat:b.name??b.spec.name,timestamp:now-Math.max(0,fleet.time-event.time)*1000});row.cursors[b.id]=event.sequence;}
 }
 book.sessions.sort((a,b)=>b.updatedAt-a.updatedAt);book.sessions.splice(30);book.events.sort((a,b)=>b.timestamp-a.timestamp);book.events.splice(200);return book;
}
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const counter=x=>Number.isFinite(x)&&x>=0;
function validSession(r){
 return record(r)&&typeof r.id==='string'&&record(r.last)&&record(r.cursors)
  &&['date','updatedAt','duration','distance','hours','fuel','collisions','maxSpeed'].every(k=>counter(r[k]))
  &&(r.durationOffset===undefined||Number.isFinite(r.durationOffset))
  &&Object.values(r.last).every(m=>record(m)&&['distance','hours','fuel','collisions'].every(k=>counter(m[k])))
  &&Object.values(r.cursors).every(x=>Number.isSafeInteger(x)&&x>=0);
}
export function readLogbook(storage){
 try{const b=JSON.parse(storage.getItem(LOGBOOK_KEY));
  if(b?.version===1&&typeof b.enabled==='boolean'&&Array.isArray(b.sessions)&&b.sessions.length<=30
   &&Array.isArray(b.events)&&b.events.length<=200&&['distance','hours','fuel','collisions'].every(k=>counter(b.totals?.[k]))
   &&b.sessions.every(validSession)&&b.events.every(e=>record(e)&&typeof e.message==='string'&&typeof e.boat==='string'&&Number.isFinite(e.timestamp)))return b;
 }catch{}return createLogbook();
}
export function writeLogbook(storage,book){try{storage.setItem(LOGBOOK_KEY,JSON.stringify(book));return true;}catch{return false;}}
export function setLogbookEnabled(input,fleet,enabled,now=Date.now()){
 const book=structuredClone(input);book.enabled=!!enabled;if(!enabled||!fleet.logbookId)return book;
 let row=book.sessions.find(q=>q.id===fleet.logbookId);
 if(!row){row={id:fleet.logbookId,date:now,updatedAt:now,duration:0,distance:0,hours:0,fuel:0,collisions:0,maxSpeed:0,last:{},cursors:{}};book.sessions.unshift(row);}
 row.durationOffset=operationalSeconds(fleet.time)-row.duration;
 for(const b of fleet.boats){row.last[b.id]={distance:number(b.operations?.distance),hours:b.engines.reduce((n,e)=>n+number(e.operatingHours),0),fuel:number(b.operations?.fuelUsed),collisions:number(b.collisionCount)};row.cursors[b.id]=b.logSequence??0;}
 book.sessions.splice(30);return book;
}
