export function anchorWinch(spec){
 if(spec.passive||spec.jet)return{manual:true,power:65,force:450,up:.18,down:.35};
 if(spec.length<4.8)return{manual:false,power:350,force:1400,up:.28,down:.55};
 if(spec.length>=7.2)return{manual:false,power:900,force:3500,up:.42,down:.75};
 return{manual:false,power:650,force:2200,up:.35,down:.65};
}
export function windlassPowered(b){const p=anchorWinch(b.spec);return p.manual||b.electrics.master!==false&&b.battery.soc>.04&&b.battery.voltage>10.2;}
