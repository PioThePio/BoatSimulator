import {clamp} from './world.js';
export const CRAFTS={
 tender:{name:'Łódź otwarta 4,2 m',length:4.2,beam:1.75,hullMass:380,draft:.28,hp:25,maxHp:60,freeboard:.45,planing:true,anchorMass:6,chain:6,lineEA:80000,lineBreak:10000},
 runabout:{name:'Motorówka 5,5 m',length:5.5,beam:2.15,hullMass:800,draft:.38,hp:60,maxHp:150,freeboard:.65,planing:true,anchorMass:10,chain:8,lineEA:160000,lineBreak:18000},
 cabin:{name:'Kabinowa 7,5 m',length:7.5,beam:2.65,hullMass:2100,draft:.55,hp:150,maxHp:250,freeboard:1.15,planing:true,anchorMass:16,chain:10,lineEA:240000,lineBreak:28000},
 cruiser:{name:'Wypornościowa 9 m',length:9,beam:3.1,hullMass:4200,draft:.75,hp:90,maxHp:200,freeboard:1.5,planing:false,anchorMass:24,chain:14,lineEA:330000,lineBreak:40000}
};
export function specification(options={}){
 const profile=options.profile in CRAFTS?options.profile:'runabout';const p=CRAFTS[profile];
 const length=clamp(Number(options.length)||p.length,3.5,11),beam=clamp(Number(options.beam)||p.beam,1.5,3.8);
 const hullMass=clamp(Number(options.hullMass)||p.hullMass,250,8000),engineCount=options.engineCount===2?2:1;
 const powers=Array.from({length:engineCount},(_,i)=>clamp(Number(options.powers?.[i])||p.hp,10,p.maxHp));
 const mass=hullMass+powers.reduce((sum,hp)=>sum+28+hp*.62,0)+150;
 const inertia=mass*((.27*length)**2+(.22*beam)**2);
 return {...p,profile,length,beam,hullMass,engineCount,powers,mass,inertia,draft:p.draft*(hullMass/p.hullMass)**.32,
  mx:mass*1.08,my:mass*1.65,iz:inertia*1.55,engineSpacing:engineCount===2?beam*.46:0,maxSteer:35*Math.PI/180};
}
export function engineState(hp,y=0){return{hp,y,command:0,gear:0,n:0,shift:0,thrust:0,rpm:750};}
export function updateEngine(engine,command,inflow,dt,damage=0){
 const cmd=clamp(command,-1,1),desired=Math.abs(cmd)<.035?0:Math.sign(cmd);
 // Shift through neutral: shaft must slow down before the reversing clutch engages.
 if(desired!==engine.gear){
  engine.n+=(0-engine.n)*(1-Math.exp(-dt/.28));engine.thrust=0;engine.shift+=dt;
  if(Math.abs(engine.n)<.055&&engine.shift>=.65){engine.gear=desired;engine.shift=0;}
 }else{
  engine.shift=0;const target=desired?(.20+.80*Math.abs(cmd)**.65):0;
  const tau=target>engine.n?.9:.45;
  engine.n+=(target-engine.n)*(1-Math.exp(-dt/tau));
 }
 const n=engine.n,gear=engine.gear;
 const staticThrust=85*engine.hp**.8,advance=gear*inflow;
 const advanceFactor=clamp(1-.22*advance/(2+11*n),.12,1.35);
 const bollard=staticThrust*n*n*(gear<0?.58:1)*advanceFactor;
 const powerLimit=.55*engine.hp*735.5*n**3/Math.max(1,Math.abs(inflow));
 engine.thrust=desired===gear?gear*Math.min(bollard,powerLimit)*(1-damage/100):0;
 engine.rpm=750+4750*n;return engine.thrust;
}
