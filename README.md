# 수원청소년문화센터 디지털 트윈

수원시 팔달구 권광로 293의 **수원청소년문화센터와 온누리아트홀**을 중심으로 외부 광장과 공개 내부 공간을 재현하는 독립 오픈소스 프로젝트입니다. 수원시나 시설 운영 기관의 공식 서비스 또는 실측도면이 아닙니다.

## 범위와 현재 단계

먼저 외부 배치, 주요 시설 덩어리와 공연장 공개 관람 영역을 검증할 수 있는 첫 모델로 시작합니다. 사진·도면을 대조하여 근거가 생긴 구역부터 세부 지오메트리, 마감재, 동선, 저사양 웹 렌더를 정밀하게 개선합니다. 근거 없는 치수·층별 배치, 실측되지 않은 최신 시설, 미완료 실내 공간을 정확히 재현했다고 표시하지 않습니다.

- [상세 마일스톤 및 구현 계획](docs/MILESTONES.ko.md)
- [조사 출처와 재배포 기준](docs/SOURCES.ko.md)
- [기여 가이드](CONTRIBUTING.md)
- [코드 라이선스(MIT)](LICENSE) · [모델·텍스처와 외부 자료의 라이선스](ASSET-LICENSES.md)

## 구조

**단일 Blender 마스터 → GLB → TypeScript/Three.js 뷰어.** 건물과 부지 모델의 편집 원본은 Blender 한 파일입니다. 뷰어는 같은 장면의 파생 산출물을 읽으며, 브라우저에서 다른 건물을 그려 대체하지 않습니다.

## 로컬 실행

Node.js 22.12 이상, npm 필요. Blender 원본과 웹용 GLB는 저장소에 있으며 기본 웹 빌드에서 Blender를 새로 실행할 필요는 없습니다.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:model
npm run inspect:model
npm run build
```

Blender에서 `models/sycc.blend`를 열어 원본을 확인합니다. 렌더러의 파일 진입점은 `public/models/sycc.glb` 하나입니다. 관측용 카메라 바로가기는 모델에 포함된 지점이며 검증된 보행 경로나 운영 시설 안내가 아닙니다.

## 첫 모델 / M1 + M2 초기 패스

- [Blender 모델 개발기](docs/MODEL-PHASES.ko.md) · [뷰어 개발기](docs/viewer/IMPLEMENTATION.ko.md)
- [모델 매니페스트와 해시](docs/model-manifest.json) · [객석도 판독](docs/seat-plan-derived.json)
- 첫 모델에는 관찰 기반 외부 골격과 온누리아트홀의 근사 전실·무대·객석이 포함됩니다. 2017년 공개 객석도를 기준으로 일반 번호석 519개와 휠체어 위치 6곳을 표기합니다. 현재 시설 치수나 관람 동선의 인증 자료가 아닙니다.
- 전체 GLB는 1,268,656바이트입니다. 기본 장면 23,808개 삼각형과 19개 드로 프리미티브는 GLB 구조를 분석한 수이며 실제 화면 드로콜·모바일 FPS가 아닙니다.

### 모델 편집과 스틸 렌더

네이티브 파일은 **Blender 5.3.0**에서 제작·검증했습니다. Blender 4.3.2에서는 이 버전의 압축 원본을 정상적으로 열 수 없었으므로 5.3에서 편집하세요. GLB 뷰어는 Blender 설치 없이 실행할 수 있습니다.

```sh
blender -b models/sycc.blend -t 4 -P blender/scripts/render_still.py -- --waypoint Overview --out renders/recheck.png --width 900 --samples 8
```

위 명령은 저장된 모델을 다시 쓰지 않고 지정 시점에서 PNG만 생성합니다.
