const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function euzebiaBeachWeight(angle){
 const distance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 return Math.max(1-smooth((distance(angle,3.15)-.8)/.45),1-smooth((distance(angle,1.05)-.7)/.35));
}
export function euzebiaSlope(angle){return .085+(.21-.085)*(1-euzebiaBeachWeight(angle));}
