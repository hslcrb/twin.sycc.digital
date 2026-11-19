/** Blender authored world-space safe rectangle. No runtime architectural geometry. */
export interface WalkRegion {shape:'aabb-plane';mode:'bounded-preview';label:string;xMin:number;xMax:number;zMin:number;zMax:number;floorY:number;eyeHeight:number;spawn:number[];target:number[]}
export function parseWalkRegion(value:unknown):WalkRegion|undefined{
 if(!value||typeof value!=='object')return;const v=value as WalkRegion;
 if(v.shape!=='aabb-plane'||v.mode!=='bounded-preview'||typeof v.label!=='string')return;
 if(![v.xMin,v.xMax,v.zMin,v.zMax,v.floorY,v.eyeHeight].every(Number.isFinite)||v.xMax-v.xMin<1||v.zMax-v.zMin<1||v.eyeHeight<1||v.eyeHeight>2.2)return;
 if(![v.spawn,v.target].every(p=>Array.isArray(p)&&p.length===3&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<1e7)))return;
 if(v.spawn[0]<v.xMin||v.spawn[0]>v.xMax||v.spawn[2]<v.zMin||v.spawn[2]>v.zMax||Math.abs(v.spawn[1]-v.floorY-v.eyeHeight)>.01)return;
 if(Math.hypot(v.target[0]-v.spawn[0],v.target[2]-v.spawn[2])<.1)return;
 return v;
}
/** 일정 속도·대각선 정규화·경계 제한. Clamp dt to prevent long-tab jumps. */
export function walkStep(x:number,z:number,yaw:number,forward:number,side:number,dt:number,r:WalkRegion){
 const length=Math.max(1,Math.hypot(forward,side));const d=1.7*Math.min(.05,Math.max(0,dt))/length;
 return {x:Math.min(r.xMax,Math.max(r.xMin,x+(Math.sin(yaw)*forward+Math.cos(yaw)*side)*d)),z:Math.min(r.zMax,Math.max(r.zMin,z+(-Math.cos(yaw)*forward+Math.sin(yaw)*side)*d)),y:r.floorY+r.eyeHeight};
}
