export function fuelFrame(station){
 return station.frame??{tx:0,ty:1,nx:1,ny:0,halfLength:(station.alongMax-station.alongMin)/2};
}
export function fuelPoint(station,along=0,normal=0){const f=fuelFrame(station);return{x:station.x+f.tx*along+f.nx*normal,y:station.y+f.ty*along+f.ny*normal};}
export function fuelLocal(station,p){const f=fuelFrame(station),x=p.x-station.x,y=p.y-station.y;return{along:x*f.tx+y*f.ty,normal:x*f.nx+y*f.ny};}
