import * as THREE from 'three';
export function disposeObject(root:THREE.Object3D){
  const geometries=new Set<THREE.BufferGeometry>();const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();
  root.traverse(node=>{
    if(node instanceof THREE.Mesh){geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material]){
      materials.add(material);for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
    }}
    if(node instanceof THREE.InstancedMesh)node.dispose();
  });
  for(const texture of textures)texture.dispose();for(const material of materials)material.dispose();for(const geometry of geometries)geometry.dispose();
}

