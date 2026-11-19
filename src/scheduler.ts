/** One frame per invalidation burst. Idle scenes have no perpetual animation loop. */
export function createFrameScheduler(render:()=>void, request:(fn:FrameRequestCallback)=>number, cancel:(id:number)=>void){
  let frame:number|undefined;let stopped=false;
  return {
    invalidate(){if(stopped||frame!==undefined)return;frame=request(()=>{frame=undefined;if(!stopped)render();});},
    dispose(){stopped=true;if(frame!==undefined)cancel(frame);frame=undefined;},
  };
}
