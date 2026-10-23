import {trimAngle} from './drive.js';
import {clamp} from './world.js';
export const THERMAL_LIMITS={high:95,alarm:105,overheat:120,shutdown:145,restart:110,recovered:100};
export function thermalStage(temperature){return temperature>=THERMAL_LIMITS.overheat?'overheat':temperature>=THERMAL_LIMITS.alarm?'alarm':temperature>=THERMAL_LIMITS.high?'high':'normal';}
// Lumped heat balance: empirical training model, not manufacturer limits.
export function thermalStep(en,dt,context={}){
 const running=en.key==='running',speed=Math.abs(context.speed??0),n=en.n;
 const intake=context.air?1:context.onTrailer?(context.intake??0):context.jet?1:(context.intake??(1-clamp((trimAngle(en.trim)*180/Math.PI-43)/25,0,1)));
 const blocked=context.air?1:(context.grounded?.20:1)*(context.raised?0:1);
 en.cooling=running?intake*blocked*(.65+.35*clamp(n/.5,0,1)):0;
 const loaded=!context.air&&running&&en.gear!==0&&speed<.8&&n>.5&&(context.moored||context.grounded);
 if(loaded)en.cooling*=.70;
 const heat=running?.20+1.35*n*n*(.5+.5*en.load)+(loaded?.85*n:0)+(context.onTrailer&&intake<.1?.65+.8*n:0):0;
 const thermostat=clamp((en.temperature-64)/12,0,1);
 const cooling=(en.temperature-18)*(running?.00065+.024*en.cooling*thermostat:.0015);
 en.temperature=clamp(en.temperature+(heat-cooling)*dt,18,155);
 en.thermalStage=thermalStage(en.temperature);
 en.overheated=en.temperature>=THERMAL_LIMITS.alarm;
 en.thermalLimit=1-.65*clamp((en.temperature-105)/30,0,1);
 if(en.temperature>=THERMAL_LIMITS.shutdown){en.key='ignition';en.thrust=0;en.gear=0;en.thermalTrip=true;}
 // A thermal trip is protection, not permanent engine damage. It does not
 // restart the engine; normal key operation is possible after cooldown.
 if(en.temperature<=THERMAL_LIMITS.recovered)en.thermalTrip=false;
 return en.thermalLimit;
}
