import type {PerspectiveCamera} from 'three';
import {walkStep,type WalkRegion} from './walk.ts';
export function createWalkController(camera:PerspectiveCamera,canvas:HTMLCanvasElement,invalidate:()=>void){
 let region:WalkRegion|undefined,yaw=0,pitch=0,frame=0,previous=0,drag:number|undefined,lastX=0,lastY=0,dead=false;
 const keys=new Set<string>(),held=new Map<number,string>();
 const disposers:(()=>void)[]=[];
 const on=(target:EventTarget,name:string,fn:EventListener)=>{target.addEventListener(name,fn);disposers.push(()=>target.removeEventListener(name,fn));};
 const aim=()=>{camera.lookAt(camera.position.x+Math.sin(yaw)*Math.cos(pitch),camera.position.y+Math.sin(pitch),camera.position.z-Math.cos(yaw)*Math.cos(pitch));invalidate();};
 const direction=()=>{const all=new Set([...keys,...held.values()]);return {forward:Number(all.has('w')||all.has('arrowup'))-Number(all.has('s')||all.has('arrowdown')),side:Number(all.has('d')||all.has('arrowright'))-Number(all.has('a')||all.has('arrowleft'))};};
 const tick=(time:number)=>{frame=0;if(!region||dead||document.hidden)return;const {forward,side}=direction();if(!forward&&!side){previous=0;return;}const p=walkStep(camera.position.x,camera.position.z,yaw,forward,side,previous?(time-previous)/1000:0,region);previous=time;camera.position.set(p.x,p.y,p.z);aim();frame=requestAnimationFrame(tick);};
 const start=()=>{if(region&&!dead&&!frame&&!document.hidden)frame=requestAnimationFrame(tick);};
 const clear=()=>{keys.clear();held.clear();drag=undefined;cancelAnimationFrame(frame);frame=0;previous=0;};
 const stop=()=>{clear();region=undefined;};
 on(canvas,'keydown',((event:KeyboardEvent)=>{if(!region)return;const key=event.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){event.preventDefault();keys.add(key);start();}}) as EventListener);
 on(window,'keyup',((event:KeyboardEvent)=>{keys.delete(event.key.toLowerCase());}) as EventListener);
 on(window,'blur',clear);on(document,'visibilitychange',()=>{if(document.hidden)clear();});
 on(canvas,'pointerdown',((event:PointerEvent)=>{if(!region||event.button!==0)return;drag=event.pointerId;lastX=event.clientX;lastY=event.clientY;canvas.setPointerCapture(event.pointerId);canvas.focus();}) as EventListener);
 on(canvas,'pointermove',((event:PointerEvent)=>{if(!region||drag!==event.pointerId)return;yaw-=(event.clientX-lastX)*.004;pitch=Math.max(-1.35,Math.min(1.35,pitch-(event.clientY-lastY)*.004));lastX=event.clientX;lastY=event.clientY;aim();}) as EventListener);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])on(canvas,type,((event:PointerEvent)=>{if(drag===event.pointerId)drag=undefined;}) as EventListener);
 return {start(r:WalkRegion){if(dead)return;clear();region=r;camera.position.set(r.spawn[0],r.floorY+r.eyeHeight,r.spawn[2]);yaw=Math.atan2(r.target[0]-r.spawn[0],-(r.target[2]-r.spawn[2]));pitch=0;aim();canvas.focus();},stop,
  bind(button:HTMLButtonElement,key:string){
   on(button,'pointerdown',((event:PointerEvent)=>{if(!region||event.button!==0)return;event.preventDefault();button.setPointerCapture(event.pointerId);held.set(event.pointerId,key);start();}) as EventListener);
   for(const type of ['pointerup','pointercancel','lostpointercapture'])on(button,type,((event:PointerEvent)=>{held.delete(event.pointerId);}) as EventListener);
   on(button,'keydown',((event:KeyboardEvent)=>{if(region&&(event.key===' '||event.key==='Enter')){event.preventDefault();keys.add(key);start();}}) as EventListener);
   on(button,'keyup',((event:KeyboardEvent)=>{if(event.key===' '||event.key==='Enter'){event.preventDefault();keys.delete(key);}}) as EventListener);on(button,'blur',()=>keys.delete(key));
  },dispose(){dead=true;stop();for(const fn of disposers)fn();}};
}
