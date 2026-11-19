import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {Box3,Mesh,Vector3,Raycaster} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {finitePoint,inspectGlb} from '../src/policy.ts';
import {parseWalkRegion} from '../src/walk.ts';
import {disposeObject} from '../src/resources.ts';
const path=new URL('../public/models/sycc.glb',import.meta.url);
test('actual model parses in Three and provides finite bounds and labelled approximate waypoint cameras',{skip:!existsSync(path)},async()=>{
 const bytes=readFileSync(path);const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);inspectGlb(data);
 const gltf=await new GLTFLoader().parseAsync(data,'');gltf.scene.updateMatrixWorld(true);
 const box=new Box3().setFromObject(gltf.scene);assert.equal(box.isEmpty(),false);assert.equal(finitePoint(box.getCenter(new Vector3()).toArray()),true);
 let meshes=0,waypoints=0;gltf.scene.traverse(node=>{if(node instanceof Mesh)meshes++;if(node.name.startsWith('Waypoint_')){
  waypoints++;assert.equal(typeof node.userData.label,'string');assert.equal(node.userData.accuracy,'approximate');
  assert.equal(finitePoint(node.userData.target),true);assert.equal(finitePoint(node.getWorldPosition(new Vector3()).toArray()),true);
 }});assert.ok(meshes>0);assert.ok(waypoints>=1);
 const node=gltf.scene.getObjectByName('WalkRegion_OnnuriLobby');
 if(node){const region=parseWalkRegion(node.userData.walkRegion);assert.ok(region);
  for(let xi=0;xi<5;xi++)for(let zi=0;zi<5;zi++){
   const x=region.xMin+(region.xMax-region.xMin)*xi/4,z=region.zMin+(region.zMax-region.zMin)*zi/4;
   const ray=new Raycaster(new Vector3(x,region.floorY+.1,z),new Vector3(0,-1,0),0,.2);
   const hits=ray.intersectObject(gltf.scene,true);assert.ok(hits.length>0);assert.ok(Math.abs(hits[0].point.y-region.floorY)<.01);
  }
 }
 disposeObject(gltf.scene);
});
