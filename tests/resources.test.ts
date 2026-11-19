import test from 'node:test';
import assert from 'node:assert/strict';
import {BufferGeometry,Group,InstancedMesh,Mesh,MeshStandardMaterial,Texture} from 'three';
import {disposeObject} from '../src/resources.ts';
test('disposes shared GLB geometry/material/texture exactly once and releases instance buffers',()=>{
 const root=new Group(),geometry=new BufferGeometry(),texture=new Texture(),material=new MeshStandardMaterial({map:texture});
 let g=0,t=0,m=0,i=0;geometry.addEventListener('dispose',()=>g++);texture.addEventListener('dispose',()=>t++);material.addEventListener('dispose',()=>m++);
 root.add(new Mesh(geometry,material));const instanced=new InstancedMesh(geometry,material,3);instanced.addEventListener('dispose',()=>i++);root.add(instanced);
 disposeObject(root);assert.deepEqual({g,t,m,i},{g:1,t:1,m:1,i:1});
});
