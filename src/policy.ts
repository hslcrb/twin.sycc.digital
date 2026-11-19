/** KR: 건축물은 이 Blender 산출물 하나에서만 온다. EN: No generated fallback buildings. */
export const MODEL_URL = '/models/sycc.glb';
export type Quality = 'auto' | 'low';
export function pixelRatio(deviceRatio: number, quality: Quality, interacting: boolean, constrained: boolean): number {
  const ratio = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  return Math.min(ratio, quality === 'low' ? 0.8 : interacting ? 1 : constrained ? 1 : 1.5);
}
export function fitDistance(radius: number, aspect: number, verticalFovDegrees: number): number {
  const half = verticalFovDegrees * Math.PI / 360;
  const limiting = Math.min(half, Math.atan(Math.tan(half) * Math.max(aspect,0.1)));
  return Math.max(radius,1) / Math.sin(limiting) * 1.12;
}
export function finitePoint(value: unknown): value is [number,number,number] {
  return Array.isArray(value) && value.length===3 && value.every(v=>typeof v==='number' && Number.isFinite(v) && Math.abs(v)<1e7);
}
/** Reject external dependencies before GLTFLoader can make secondary requests. */
export function inspectGlb(buffer: ArrayBuffer): void {
  if(buffer.byteLength<20 || buffer.byteLength>128*1024*1024)throw new Error('모델 크기가 허용 범위를 벗어났습니다.');
  const view=new DataView(buffer);
  if(view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2 || view.getUint32(8,true)!==buffer.byteLength)throw new Error('올바른 GLB 2 모델이 아닙니다.');
  const length=view.getUint32(12,true);
  if(view.getUint32(16,true)!==0x4e4f534a || length>buffer.byteLength-20)throw new Error('GLB 메타데이터가 손상되었습니다.');
  const json=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,length))) as {buffers?:{uri?:unknown}[];images?:{uri?:unknown}[]};
  for(const entry of [...(json.buffers??[]),...(json.images??[])])if(entry.uri!==undefined)throw new Error('외부 파일을 참조하는 모델은 지원하지 않습니다.');
}
