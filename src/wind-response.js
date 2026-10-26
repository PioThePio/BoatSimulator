const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function windSurface(speed,enabled=true){
 const v=enabled?clamp(speed,0,25):0,rough=clamp((v-3)/9,0,1),white=clamp((v-6)/9,0,1);
 return{rough,white,density:1+.9*white,spacing:1/Math.sqrt(1+.9*white),tint:rough*.16,opacity:.08+.17*rough};
}
export function windSound(speed,enabled=true){const v=enabled?clamp(speed,0,25):0;return{level:v*.004,cutoff:250+v*95};}
