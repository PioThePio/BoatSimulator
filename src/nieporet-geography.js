import {NIEPORET_REFERENCE as R} from './nieporet-reference.js';
// One survey, one isotropic metre scale. Only its geographic anchor uses the
// compressed atlas; piers, banks, canal and both basins share this transform.
export const SURVEY_SCALE={metresPerPixel:100/130,referenceBarPixels:130,referenceBarMetres:100,localScale:1,rotation:0};
export function surveyProjection(fromGeo,worldScale){
 const anchor=fromGeo(R.anchor[1],R.anchor[0]);
 return coordinates=>{const p=fromGeo(coordinates[1],coordinates[0]);return{x:anchor.x+(p.x-anchor.x)/worldScale,y:anchor.y+(p.y-anchor.y)/worldScale};};
}
export function reconstructedShore(project,bottom){
 // The narrow "Zatopione Barki" shield is separately mapped as a hulk.
 // Insert its visible outline into the connected bank instead of omitting it
 // or drawing a second wooden pier on top of it.
 const shield=R.features['974972779'],east=[...R.eastCoast.slice(0,187),...shield.slice(1,10),...R.eastCoast.slice(189)].map(project),ec=R.eastCanal.map(project),wc=R.westCanal.map(project),west=R.westCoast.map(project);
 const chain=[...east,...ec,{x:ec.at(-1).x,y:bottom},{x:wc[0].x,y:bottom},...wc,...west];
 // Consecutive shared mouth vertices must not produce zero-length BVH edges.
 return chain.filter((p,i)=>!i||Math.hypot(p.x-chain[i-1].x,p.y-chain[i-1].y)>.001);
}
export function withinSurvey(x,y,box,padding=0){return x>box.left-padding&&x<box.right+padding&&y>box.top-padding&&y<box.bottom+padding;}
