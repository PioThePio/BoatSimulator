const clamp=x=>Math.max(0,Math.min(1,x));
// Engine fuel is independent of propulsor (shaft / steerable sterndrive).
// Same rated shaft power does not grant a diesel extra power at the propeller.
export function dieselAvailable(profile,propulsion){return ['runabout','cabin','cruiser'].includes(profile)&&['zdrive','inboard'].includes(propulsion);}
export function combustionType(profile,propulsion,choice){return choice==='diesel'&&dieselAvailable(profile,propulsion)?'diesel':'petrol';}
export function engineMass(hp,type){return type==='diesel'?115+1.05*hp:28+.62*hp;}
export function turboStep(engine,command,dt){
 const target=engine.gear?clamp((engine.n-.42)/.45)*clamp((Math.abs(command)-.3)/.7)*(.85+.15*engine.load):0;
 engine.boost=(engine.boost??0)+(target-(engine.boost??0))*(1-Math.exp(-dt/(target>(engine.boost??0)?.65:.16)));
 return engine.boost;
}
export function shaftPowerFraction(n,{racing=false,engineType='petrol'}={},boost=1){return racing?n**3*(.48+.52*boost):engineType==='diesel'?n**2.65:n**3;}
export function engineRPMRange(spec){return spec.racing?{idle:800,span:6000,max:7000}:spec.engineType==='diesel'?{idle:700,span:2800,max:4000}:{idle:750,span:4750,max:6500};}
