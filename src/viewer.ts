import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MODEL_URL, finitePoint, fitDistance, inspectGlb, pixelRatio, type Quality } from './policy.ts';
import { disposeObject } from './resources.ts';
import { createWalkController } from './walk-controller.ts';
import { parseWalkRegion, type WalkRegion } from './walk.ts';
import { createFrameScheduler } from './scheduler.ts';
export interface Waypoint { label:string; approximate:boolean; go:()=>void }
interface Options { host:HTMLElement; status:(message:string)=>void; ready:(points:Waypoint[],note:string)=>void; failed:(error:unknown)=>void; walkAvailable:(available:boolean)=>void; walking:(active:boolean)=>void }


export function createViewer({host,status,ready,failed,walkAvailable,walking}:Options){
  const renderer=new THREE.WebGLRenderer({antialias:false,alpha:true,powerPreference:'low-power'});
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  // 투명 배경은 정적 CSS 하늘을 드러낸다. CSS sky is not a reflection map.
  renderer.setClearColor(0x000000,0);renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label','3D 모델. 방향키 이동, 더하기와 빼기 확대, Home 전체 보기');
  host.append(renderer.domElement);
  const scene=new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xf4fbff,0x75846b,2.5));
  const sun=new THREE.DirectionalLight(0xfff0dc,3);sun.position.set(-80,150,80);scene.add(sun);
  const camera=new THREE.PerspectiveCamera(45,1,0.1,10000);camera.position.set(100,80,100);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;controls.enabled=false;
  controls.listenToKeyEvents(renderer.domElement);controls.keyPanSpeed=20;
  const abort=new AbortController();const cleanups:(()=>void)[]=[];
  let dead=false,quality:Quality='auto',interacting=false,timer:ReturnType<typeof setTimeout>|undefined;
  let model:THREE.Object3D|undefined;const center=new THREE.Vector3();let radius=50;
  const constrained=navigator.hardwareConcurrency<=4 || matchMedia('(pointer: coarse)').matches;
  const fail=(error:unknown)=>{if(dead)return;dispose();failed(error);};
  const scheduler=createFrameScheduler(()=>{if(dead||document.hidden)return;try{renderer.render(scene,camera);}catch(error){fail(error);}},requestAnimationFrame,cancelAnimationFrame);
  const walker=createWalkController(camera,renderer.domElement,()=>scheduler.invalidate());
  let walkRegion:WalkRegion|undefined,isWalking=false;
  const leaveWalk=()=>{walker.stop();isWalking=false;walking(false);controls.enabled=Boolean(model)&&!document.hidden;};
  const ratio=()=>{
    const next=pixelRatio(window.devicePixelRatio,quality,interacting,constrained);
    if(renderer.getPixelRatio()!==next)renderer.setPixelRatio(next);
  };
  const size=new THREE.Vector2();
  const resize=()=>{if(dead)return;const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);ratio();renderer.getSize(size);
    if(size.x!==w||size.y!==h)renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();scheduler.invalidate();};
  const home=()=>{if(dead||!model)return;leaveWalk();const distance=fitDistance(radius,camera.aspect,camera.fov);
    camera.position.copy(center).addScaledVector(new THREE.Vector3(1,0.72,1).normalize(),distance);controls.target.copy(center);controls.update();scheduler.invalidate();};
  const start=()=>{if(dead)return;interacting=true;clearTimeout(timer);ratio();scheduler.invalidate();};
  const end=()=>{if(dead)return;timer=setTimeout(()=>{if(dead)return;interacting=false;ratio();scheduler.invalidate();},140);};
  const change=()=>scheduler.invalidate();controls.addEventListener('start',start);controls.addEventListener('end',end);controls.addEventListener('change',change);
  const onKey=(event:KeyboardEvent)=>{
    if(dead||!controls.enabled)return;
    if(event.key==='Home'){event.preventDefault();home();return;}
    if(['+','=','-','_'].includes(event.key)){event.preventDefault();const offset=camera.position.clone().sub(controls.target);offset.multiplyScalar(event.key==='-'||event.key==='_'?1.15:1/1.15);offset.setLength(THREE.MathUtils.clamp(offset.length(),controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);controls.update();scheduler.invalidate();}
  };
  renderer.domElement.addEventListener('keydown',onKey);cleanups.push(()=>renderer.domElement.removeEventListener('keydown',onKey));
  const contextLost=(event:Event)=>{event.preventDefault();fail(new Error('그래픽 컨텍스트가 종료되었습니다. 다시 시도해 주세요.'));};
  renderer.domElement.addEventListener('webglcontextlost',contextLost);cleanups.push(()=>renderer.domElement.removeEventListener('webglcontextlost',contextLost));
  const visibility=()=>{if(document.hidden){clearTimeout(timer);interacting=false;controls.enabled=false;}else if(!dead){controls.enabled=Boolean(model)&&!isWalking;resize();}};
  document.addEventListener('visibilitychange',visibility);cleanups.push(()=>document.removeEventListener('visibilitychange',visibility));
  const observer=new ResizeObserver(resize);observer.observe(host);cleanups.push(()=>observer.disconnect());resize();
  function dispose(){
    if(dead)return;dead=true;abort.abort();clearTimeout(timer);scheduler.dispose();walker.dispose();controls.dispose();for(const cleanup of cleanups)cleanup();
    if(model){scene.remove(model);disposeObject(model);model=undefined;}
    renderer.dispose();renderer.domElement.remove();
  }
  const loaded=(async()=>{
    status('Blender GLB 모델을 내려받고 있습니다.');
    const response=await fetch(MODEL_URL,{signal:abort.signal,credentials:'same-origin'});
    if(!response.ok){await response.body?.cancel().catch(()=>{});throw new Error(`모델을 불러오지 못했습니다 (HTTP ${response.status}).`);}
    const data=await response.arrayBuffer();if(dead)return;inspectGlb(data);
    status('모델을 해석하고 있습니다. 잠시 기다려 주세요.');
    const gltf=await new GLTFLoader().parseAsync(data,'');
    if(dead){disposeObject(gltf.scene);return;}
    model=gltf.scene;scene.add(model);model.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model);if(box.isEmpty())throw new Error('모델 안에 표시할 공간이 없습니다.');
    box.getCenter(center);radius=Math.max(box.getSize(new THREE.Vector3()).length()/2,1);
    if(!finitePoint(center.toArray())||!Number.isFinite(radius))throw new Error('모델 좌표가 유효하지 않습니다.');
    camera.near=Math.max(0.05,radius/10000);camera.far=Math.max(2000,radius*30);camera.updateProjectionMatrix();
    controls.minDistance=Math.max(0.3,radius/400);controls.maxDistance=radius*8;controls.maxPolarAngle=Math.PI*0.98;controls.enabled=!document.hidden;
    const waypoints:Waypoint[]=[];
    model.traverse(node=>{
      if(node.name==='WalkRegion_OnnuriLobby')walkRegion=parseWalkRegion(node.userData.walkRegion);
      if(!node.name.startsWith('Waypoint_')||typeof node.userData.label!=='string'||waypoints.length>=24)return;
      const eye=node.getWorldPosition(new THREE.Vector3());const target=finitePoint(node.userData.target)?new THREE.Vector3(...node.userData.target):center.clone();
      if(!finitePoint(eye.toArray())||eye.distanceTo(target)<0.1)return;
      waypoints.push({label:node.userData.label.slice(0,80),approximate:node.userData.accuracy!=='verified',go(){if(dead)return;leaveWalk();camera.position.copy(eye);controls.target.copy(target);controls.update();scheduler.invalidate();}});
    });
    walkAvailable(Boolean(walkRegion));home();ready(waypoints,'초기 블록아웃 · 과거 사진 참고 및 근사 치수로 만든 모델입니다. 현재 외관·실내 배치·실제 스케일은 미검증입니다. 공개 공간 시점도 근사입니다.');status('근사 모델 탐색 준비 완료');
  })().catch(error=>{if(!dead)fail(error);});
  return {home,dispose,loaded,bindWalkButton:walker.bind,startWalk(){if(dead||!walkRegion)return;isWalking=true;controls.enabled=false;walking(true);walker.start(walkRegion);status('로비 보행 · 근사 안전영역 안에서만 이동합니다.');},setQuality(value:Quality){if(dead)return;quality=value;ratio();scheduler.invalidate();}};
}
