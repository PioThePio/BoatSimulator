// Existing rope elasticity/breaking loads stay with the hull profile. A
// mechanical capstan trades hauling speed for force, without electric power.
export function mooringGear(spec,assisted=false){
 const strength=spec.lineBreak,diameter=strength<=8000?8:strength<=10000?8:strength<=18000?10:strength<=28000?12:strength<=45000?14:16;
 const available=spec.length>=7&&!spec.jet&&!spec.air;
 const ratio=available&&assisted?4:1;
 return{diameter,strength,available,ratio,efficiency:ratio>1?.8:1,speed:.45/ratio,paySpeed:.45,power:110*(ratio>1?.8:1)};
}
