import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {MODEL_URL,pixelRatio,fitDistance,finitePoint,inspectGlb} from '../src/policy.ts';
import {waypointLabel} from '../src/waypoint-label.ts';
import {createFrameScheduler} from '../src/scheduler.ts';
function glb(json:object){const text=new TextEncoder().encode(JSON.stringify(json));const size=Math.ceil(text.length/4)*4;const buffer=new ArrayBuffer(20+size);const view=new DataView(buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,buffer.byteLength,true);view.setUint32(12,size,true);view.setUint32(16,0x4e4f534a,true);const bytes=new Uint8Array(buffer,20);bytes.fill(32);bytes.set(text);return buffer;}
test('loads exactly one embedded Blender GLB URL, never substitutes buildings',()=>{
 assert.equal(MODEL_URL,'/models/sycc.glb');
 const source=readFileSync(new URL('../src/viewer.ts',import.meta.url),'utf8');
 assert.equal((source.match(/fetch\(/g)||[]).length,1);assert.doesNotMatch(source,/new THREE\.\w*Geometry/);
 assert.doesNotMatch(source,/requestAnimationFrame\(\s*(?:animate|loop)/);
});
test('accepts embedded GLB and rejects external textures/buffers before loader requests',()=>{
 assert.doesNotThrow(()=>inspectGlb(glb({asset:{version:'2.0'},buffers:[{byteLength:4}],images:[{bufferView:0}]})));
 for(const json of [{images:[{uri:'https://other.test/x.png'}]},{buffers:[{uri:'x.bin'}]}])assert.throws(()=>inspectGlb(glb(json)),/외부/);
 assert.throws(()=>inspectGlb(new ArrayBuffer(3)));
 const corrupt=glb({});new DataView(corrupt).setUint32(8,1,true);assert.throws(()=>inspectGlb(corrupt));
});
test('DPR is bounded for phones/interaction and restores quality without exceeding device density',()=>{
 assert.equal(pixelRatio(3,'auto',false,false),1.5);assert.equal(pixelRatio(3,'auto',true,false),1);
 assert.equal(pixelRatio(3,'auto',false,true),1);assert.equal(pixelRatio(3,'low',false,false),.8);
 assert.equal(pixelRatio(.5,'auto',false,false),.5);assert.equal(pixelRatio(NaN,'auto',false,false),1);
});
test('narrow screens fit further away and waypoint coordinates reject invalid numbers',()=>{
 assert.ok(fitDistance(50,.5,45)>fitDistance(50,2,45));assert.ok(Number.isFinite(fitDistance(0,0,45)));
 assert.equal(finitePoint([1,2,3]),true);for(const value of [[1,2],['1',2,3],[1,Infinity,3],[1,2,1e20],null])assert.equal(finitePoint(value),false);
});
test('200 invalidations coalesce into one frame with zero idle callbacks',()=>{
 let calls=0,id=0;const pending=new Map<number,FrameRequestCallback>();
 const scheduler=createFrameScheduler(()=>calls++,fn=>{pending.set(++id,fn);return id;},key=>pending.delete(key));
 for(let i=0;i<200;i++)scheduler.invalidate();assert.equal(pending.size,1);
 const [key,fn]=[...pending][0];pending.delete(key);fn(0);assert.equal(calls,1);assert.equal(pending.size,0);
 scheduler.invalidate();scheduler.dispose();assert.equal(pending.size,0);scheduler.invalidate();assert.equal(pending.size,0);
});
test('even an already queued callback cannot render after disposal',()=>{
 let callback:FrameRequestCallback|undefined;let renders=0;
 const scheduler=createFrameScheduler(()=>renders++,fn=>{callback=fn;return 1;},()=>{});scheduler.invalidate();scheduler.dispose();callback?.(0);assert.equal(renders,0);
});
const model=new URL('../public/models/sycc.glb',import.meta.url);
test('production model is valid embedded GLB',{skip:!existsSync(model)},()=>{
 const file=readFileSync(model);inspectGlb(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength));
});

test('waypoint evidence labels retain approximation exactly once',()=>{
 assert.equal(waypointLabel('광장',true),'광장 · 근사');
 assert.equal(waypointLabel('광장 (근사)',true),'광장 (근사)');
 assert.equal(waypointLabel('실측 광장',false),'실측 광장');
});
test('sky is static CSS behind an alpha canvas, with no environment or animation claim',()=>{
 const source=readFileSync(new URL('../src/viewer.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/style.css',import.meta.url),'utf8');
 assert.match(source,/alpha:true/);assert.match(source,/setClearColor\(0x000000,0\)/);
 assert.doesNotMatch(source,/scene\.background\s*=|scene\.environment\s*=/);
 assert.match(css,/linear-gradient\(180deg/);
 assert.match(css,/#waypoints\{flex-wrap:nowrap;overflow-x:auto/);
 assert.match(css,/max-height:46svh;overflow-y:auto/);
});
