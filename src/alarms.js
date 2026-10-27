// One acknowledgement latch per boat. Sources clear/recur independently; a new
// source or severity re-arms sound, as does a real master-power cycle.
export function alarmSources(b){
 const keys=[];if(b.spec.profile==='suv'||b.spec.passive)return keys;
 if(b.bilge?.alarm)keys.push('bilge');
 for(const [i,en]of b.engines.entries()){
  if(en.key==='ignition'&&!b.suppressIgnitionAlarm)keys.push('ignition:'+i);
  if(en.key!=='off'&&(en.temperature>=105||en.thermalTrip))keys.push('temperature:'+i+':'+(en.temperature>=120?'overheat':'alarm'));
 }
 return keys;
}
export function resetAlarms(b){b.alarmControl={active:[],muted:false};}
export function alarmStatus(b){
 const powered=b.electrics?.master!==false&&!b.electrics?.floodFault&&(b.battery.soc>.001||(b.battery.alternatorCurrent??0)>2)&&b.battery.voltage>9.5;
 const active=powered?alarmSources(b):[],old=b.alarmControl??{active:[],muted:false};
 const muted=powered&&active.length>0&&!!old.muted&&Array.isArray(old.active)&&!active.some(key=>!old.active.includes(key));
 b.alarmControl={active,muted};
 const bilge=active.includes('bilge'),temperature=active.some(k=>k.startsWith('temperature:')),ignition=active.some(k=>k.startsWith('ignition:'));
 return{powered,active,muted,critical:bilge||temperature,lit:active.length>0,bilgeAlarm:bilge&&!muted,temperatureAlarm:temperature&&!muted,ignitionAlarm:ignition&&!muted};
}
export function acknowledgeAlarms(b){const status=alarmStatus(b);if(status.lit)b.alarmControl.muted=true;return alarmStatus(b);}
