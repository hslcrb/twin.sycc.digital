import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera} from 'three';
import {parseWalkRegion,walkStep,type WalkRegion} from '../src/walk.ts';
import {createWalkController} from '../src/walk-controller.ts';
const region:WalkRegion={shape:'aabb-plane',mode:'bounded-preview',label:'로비 · 근사',xMin:34,xMax:44,zMin:-13,zMax:-6,floorY:.28,eyeHeight:1.65,spawn:[39,1.93,-10],target:[39,1.93,-6]};
test('only authored valid bounded rectangles enable walking',()=>{
 assert.ok(parseWalkRegion(region));for(const patch of [{shape:'mesh'},{spawn:[0,0,0]},{xMax:33},{floorY:Infinity},{eyeHeight:0},{target:[39,1.93,-10]}])assert.equal(parseWalkRegion({...region,...patch}),undefined);assert.equal(parseWalkRegion(undefined),undefined);
});
test('kinematic route normalizes diagonals, clamps time and never exits floor rectangle',()=>{
 const direct=walkStep(39,-10,0,1,0,.05,region),diagonal=walkStep(39,-10,0,1,1,.05,region);
 assert.ok(Math.abs(Math.hypot(direct.x-39,direct.z+10)-Math.hypot(diagonal.x-39,diagonal.z+10))<1e-9);
 assert.deepEqual(walkStep(39,-10,0,1,0,900,region),direct);
 let p={x:39,z:-10,y:1.93};for(let i=0;i<10000;i++)p=walkStep(p.x,p.z,i*.1,1,1,.05,region);
 assert.ok(p.x>=34&&p.x<=44&&p.z>=-13&&p.z<=-6);assert.equal(p.y,.28+1.65);
});
test('actual controller movement stops on release, blur, hidden, mode exit and disposal',()=>{
 const old=new Map<string,PropertyDescriptor|undefined>();
 const windowTarget=new EventTarget(),documentTarget=Object.assign(new EventTarget(),{hidden:false});
 const pending=new Map<number,FrameRequestCallback>();let next=0;
 const globals={window:windowTarget,document:documentTarget,requestAnimationFrame:(fn:FrameRequestCallback)=>{pending.set(++next,fn);return next;},cancelAnimationFrame:(id:number)=>pending.delete(id)};
 for(const [key,value] of Object.entries(globals)){old.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{configurable:true,value});}
 try{
  const canvas=Object.assign(new EventTarget(),{focus(){},setPointerCapture(){}}) as unknown as HTMLCanvasElement;
  const camera=new PerspectiveCamera();let renders=0;const controller=createWalkController(camera,canvas,()=>renders++);
  const event=(target:EventTarget,type:string,props:object)=>target.dispatchEvent(Object.assign(new Event(type,{cancelable:true}),props));
  const frame=(time:number)=>{for(const [id,fn] of [...pending]){pending.delete(id);fn(time);}};
  controller.start(region);event(canvas,'keydown',{key:'w'});frame(100);frame(150);assert.ok(camera.position.z>-10);event(windowTarget,'keyup',{key:'w'});frame(200);assert.equal(pending.size,0);
  for(const action of ['blur','hidden','stop']){event(canvas,'keydown',{key:'w'});assert.equal(pending.size,1);if(action==='blur')event(windowTarget,'blur',{});if(action==='hidden'){documentTarget.hidden=true;event(documentTarget,'visibilitychange',{});}if(action==='stop')controller.stop();assert.equal(pending.size,0);documentTarget.hidden=false;controller.start(region);}
  const button=Object.assign(new EventTarget(),{setPointerCapture(){}}) as unknown as HTMLButtonElement;controller.bind(button,'w');event(button,'pointerdown',{button:0,pointerId:7});frame(300);frame(350);assert.ok(camera.position.z>-10);event(button,'pointercancel',{pointerId:7});frame(400);assert.equal(pending.size,0);
  controller.dispose();const count=renders;event(canvas,'keydown',{key:'w'});controller.start(region);frame(500);assert.equal(pending.size,0);assert.equal(renders,count);
 }finally{for(const [key,descriptor] of old){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else Reflect.deleteProperty(globalThis,key);}}
});
