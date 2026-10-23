// Interpreted shoreline from the user's Zegrze maps, not a navigation chart.
// Atlas: 75 pixels = 1 real km. v20 compresses geographic distances to 70%;
// physical boat, pier, slip and tree dimensions / SI speed and time stay unchanged.
// Independent checks: GeoNames Serock/Nieporęt and the BDOT10k/OSM geoportal.
// See docs/ZEGRZE.md for provenance, scale checks and bathymetry limitations.
export const WORLD_DISTANCE_SCALE=.70;
export const METRES_PER_MAP_PIXEL=1000/75*WORLD_DISTANCE_SCALE;
// Compress geography about the main quay; all manufactured objects retain SI dimensions.
export const compressWorld=p=>({x:80+(p.x-80)*WORLD_DISTANCE_SCALE,y:4+(p.y-4)*WORLD_DISTANCE_SCALE});
const origin={x:610,y:739,latitude:52.458,longitude:21.034916};
const R=6371008.8,rad=Math.PI/180;
export const fromAtlas=(x,y)=>compressWorld({x:(x-origin.x)*1000/75,y:(y-origin.y)*1000/75});
export function fromGeo(latitude,longitude){return compressWorld({x:(longitude-origin.longitude)*rad*R*Math.cos(origin.latitude*rad),y:(origin.latitude-latitude)*rad*R});}
export function toGeo(x,y){x=80+(x-80)/WORLD_DISTANCE_SCALE;y=4+(y-4)/WORLD_DISTANCE_SCALE;return{latitude:origin.latitude-y/(R*rad),longitude:origin.longitude+x/(R*rad*Math.cos(origin.latitude*rad))};}
const bank=[
 [0,449],[32,450],[90,459],[144,480],[219,493],[253,519],[310,553],[345,591],[395,619],[441,643],[480,663],[525,688],[567,690],[555,714],[589,737],
 // The simulator marina has a short engineered quay on the Zegrze headland.
 [607.75,739.3],[625,739.3],[649,729],[677,719],[698,696],[716,668],[732,643],[744,608],[759,573],[778,543],[799,515],[808,471],[820,441],[833,414],[846,370],[849,321],[857,282],[868,244],[869,198],[870,161],[871,111],[868,50],[874,0],
 [928,0],[924,49],[924,87],[920,133],[918,173],[933,190],[971,183],[1007,201],[1045,197],[1068,190],[1080,196],[1090,201],[1111,189],[1152,204],[1198,198],[1240,197],[1280,205],
 [1280,249],[1243,244],[1208,262],[1184,278],[1136,272],[1099,279],[1067,277],[1049,299],[1034,313],[1032,343],[1061,377],[1053,402],[1021,398],[1004,378],[996,355],[985,345],[968,347],[954,371],[937,403],[913,436],[900,471],[890,506],[880,541],[862,557],
 [848,574],[879,564],[904,566],[915,574],[951,571],[991,560],[1050,555],[1130,550],[1130,557],[1051,562],[991,568],[951,580],[914,581],[894,583],[879,580],[856,584],
 [845,594],[840,610],[834,645],[830,680],[837,708],[834,741],[826,775],[815,796],[803,807],[788,820],[778,845],[764,858],[753,888],[735,911],[717,937],[697,962],[674,983],
 [660,1005],[650.9,1018],[650.9,1042],[649.1,1042],[649.1,1018],[641,1008],[637,989],[633,978],[626,977],[623,951],[628,928],[621,920],[599,909],[587,898],[563,891],[548,882],[525,881],[507,872],[490,857],[490,843],[502,828],[514,815],[522,796],[531,781],[541,766],[556,748],
 [526,735],[503,725],[476,709],[448,686],[417,666],[392,652],[370,630],[345,609],[319,596],[298,575],[278,561],[258,546],[236,535],[219,521],[184,515],[146,500],[108,482],[66,478],[30,475],[0,476]
];
// Preserve atlas landmarks and the engineered main quay; add metre-scale
// coves between them rather than large, ruler-straight stretches of bank.
export const ZEGRZE_SHORE=bank.flatMap(([x,y],i)=>{
 const a=fromAtlas(x,y),next=bank[(i+1)%bank.length],b=fromAtlas(...next),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),count=Math.max(1,Math.ceil(length/(65*WORLD_DISTANCE_SCALE)));
 const marina=Math.hypot((a.x+b.x)/2-80,(a.y+b.y)/2)<450*WORLD_DISTANCE_SCALE;
 const beach=[[525,881],[345,609],[764,858]].some(([px,py])=>Math.hypot((x+next[0])/2-px,(y+next[1])/2-py)<18);
 return Array.from({length:count},(_,j)=>{const t=j/count,amplitude=marina||beach||length<160*WORLD_DISTANCE_SCALE?0:Math.min(8*WORLD_DISTANCE_SCALE,length*.015),bend=amplitude*Math.sin(Math.PI*t)*(Math.sin(t*Math.PI*4+i*1.7)+.35*Math.sin(t*Math.PI*9+i));return{x:a.x+dx*t-dy/length*bend,y:a.y+dy*t+dx/length*bend};});
});
const lo=fromAtlas(0,0),hi=fromAtlas(1280,1042);
export const ZEGRZE_BOUNDS={left:lo.x,top:lo.y,right:hi.x,bottom:hi.y};
export const ZEGRZE_ISLANDS=[{...fromAtlas(1020,246),rx:100*WORLD_DISTANCE_SCALE,ry:36*WORLD_DISTANCE_SCALE},{...fromAtlas(1098,230),rx:130*WORLD_DISTANCE_SCALE,ry:44*WORLD_DISTANCE_SCALE},{...fromAtlas(1170,233),rx:80*WORLD_DISTANCE_SCALE,ry:30*WORLD_DISTANCE_SCALE}];
export const MAP_LABELS=[['Zegrze Północne',607,722],['Zegrze Południowe',532,783],['Nieporęt',646,978],['Białobrzegi',761,864],['Rynia',860,715],['Serock',808,293],['Jachranka',270,500],['Skubianka',393,607],['Dębe',86,443],['Wierzbica',824,80],['Narew',884,128],['Bug',1110,218],['Rządza',1060,544],['Kanał Żerański',664,1020]].map(([name,x,y])=>({name,...fromAtlas(x,y)}));
export const REMOTE_HARBORS=[
 {id:'NIE',name:'Nieporęt',...fromAtlas(625,930),direction:'east',length:38},
 {id:'BIA',name:'Białobrzegi',...fromAtlas(778,845),direction:'west',length:32},
 {id:'RYN',name:'Rynia',...fromAtlas(837,708),direction:'west',length:35},
 {id:'SER',name:'Serock',...fromAtlas(849,321),direction:'east',length:40},
 {id:'JAC',name:'Jachranka',...fromAtlas(310,553),direction:'south',length:28},
 {id:'SKU',name:'Skubianka',...fromAtlas(395,619),direction:'south',length:30},
 {id:'WIE',name:'Wieliszew',...fromAtlas(345,609),direction:'north',length:24},
 {id:'RZA',name:'Zatoka Rządzy',...fromAtlas(904,566),direction:'south',length:20}
];
export const FUEL_LOCATION={...fromAtlas(834,741)};
// Bridge decks are overhead; only piers/abutments collide with the hull.
export const BRIDGES=[
 {id:'zegrze',name:'Most w Zegrzu',a:fromAtlas(555,714),b:fromAtlas(541,766),width:17,clearance:7.5,piers:[.30,.66]},
 {id:'wierzbica',name:'Most w Wierzbicy',a:fromAtlas(862,63),b:fromAtlas(931,67),width:12,clearance:6.5,piers:[.24,.5,.76]},
 {id:'debe',name:'Zapora Dębe',a:fromAtlas(58,449),b:fromAtlas(58,480),width:12,clearance:0,dam:true,piers:[]},
 {id:'nieporet',name:'Most · Kanał Żerański',a:fromAtlas(647.5,1026),b:fromAtlas(652.5,1026),width:11,clearance:3.5,piers:[]}
];

export const GEONAMES_LANDMARKS=[{name:'Serock',latitude:52.51036,longitude:21.0691},{name:'Nieporęt',latitude:52.43152,longitude:21.03212},{name:'Białobrzegi',latitude:52.44199,longitude:21.05255},{name:'Wieliszew',latitude:52.4513,longitude:20.96827}].map(q=>({...q,...fromGeo(q.latitude,q.longitude)}));
for(const q of GEONAMES_LANDMARKS){const label=MAP_LABELS.find(p=>p.name===q.name);if(label)Object.assign(label,{x:q.x,y:q.y});else MAP_LABELS.push(q);}
