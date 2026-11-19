/** 이미 근사임을 밝힌 모델 라벨은 반복하지 않는다. Preserve existing evidence labels. */
export function waypointLabel(label:string, approximate:boolean):string{
  return label+(approximate&&!label.includes('근사')?' · 근사':'');
}
