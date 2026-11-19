import './style.css';
import type { createViewer } from './viewer.ts';
const host=document.querySelector<HTMLElement>('#viewport')!;
const status=document.querySelector<HTMLElement>('#status')!;
const loading=document.querySelector<HTMLElement>('#loading')!;
const home=document.querySelector<HTMLButtonElement>('#home')!;
const retry=document.querySelector<HTMLButtonElement>('#retry')!;
const quality=document.querySelector<HTMLSelectElement>('#quality')!;
const points=document.querySelector<HTMLElement>('#waypoints')!;
const note=document.querySelector<HTMLElement>('#model-note')!;
let viewer:ReturnType<typeof createViewer>|undefined;let attempt=0;
function failure(error:unknown){
  loading.hidden=false;loading.textContent=error instanceof Error?error.message:'3D 표시를 시작할 수 없습니다.';
  status.textContent='표시 중단 · 다시 시도할 수 있습니다.';note.textContent='모델을 대신하는 임의 건축물은 표시하지 않습니다.';
  retry.hidden=false;home.disabled=true;points.replaceChildren();
}
async function boot(){
  const current=++attempt;viewer?.dispose();viewer=undefined;retry.hidden=true;home.disabled=true;points.replaceChildren();loading.hidden=false;loading.textContent='3D 뷰어를 준비하고 있습니다.';
  try{
    const {createViewer}=await import('./viewer.ts');if(current!==attempt)return;
    viewer=createViewer({host,status:message=>{if(current!==attempt)return;status.textContent=message;loading.textContent=message;},failed:failure,
      ready(waypoints,modelNote){if(current!==attempt)return;loading.hidden=true;home.disabled=false;note.textContent=modelNote;
        for(const point of waypoints){const button=document.createElement('button');button.type='button';button.textContent=point.label+(point.approximate?' · 근사':'');button.addEventListener('click',point.go);points.append(button);}
      }});
    viewer.setQuality(quality.value==='low'?'low':'auto');
  }catch(error){if(current===attempt)failure(error);}
}
home.addEventListener('click',()=>viewer?.home());retry.addEventListener('click',()=>void boot());quality.addEventListener('change',()=>viewer?.setQuality(quality.value==='low'?'low':'auto'));
// BFCache restores a live page; only dispose on a non-persisted final departure.
window.addEventListener('pagehide',event=>{if(!event.persisted){attempt++;viewer?.dispose();}});
void boot();
