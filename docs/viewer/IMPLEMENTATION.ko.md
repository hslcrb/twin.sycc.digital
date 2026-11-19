# SYCC 웹 뷰어 구현 기록

## 시작 조건과 범위

제품 구현은 마일스톤 커밋 `18258ecfc21e5eed3ee4652cf2bba9742ebc1dbf` 검증 후 START 승인을 받은 다음 시작했다. 그 전에는 읽기 전용 구조 설계만 수행했다. 이 작업의 소유 범위는 Vite/TypeScript 웹 뷰어, 패키지·lockfile, 테스트이며 Blender 원본과 모델 형상은 별도 작업자가 담당한다. 원격 GitHub 쓰기와 배포는 수행하지 않았다.

뷰어는 `/models/sycc.glb`라는 단일 Blender GLB만 요청한다. 웹에서 건물, 실내, 지형, 도로 geometry를 대신 생성하지 않는다. 파일이 없거나 잘못되면 오류와 재시도 버튼을 표시한다. 임의 상자 건축물을 성공한 디지털 트윈처럼 보여주지 않는다. 조명·카메라·배경색은 뷰어의 렌더링 환경이며 실측 환경이라고 표시하지 않는다.

## 구조

- main.ts: 접근 가능한 HTML 상태 갱신, 초기 동적 import, 전체 보기·품질·재시도 UI.
- viewer.ts: Three renderer, OrbitControls, GLB 단일 로드, bounds 기반 카메라, 공개 waypoint, 종료 처리.
- policy.ts: URL·DPR·카메라 fit·좌표 검증·embedded GLB 검사.
- scheduler.ts: 무효화 요청을 한 프레임으로 합치는 렌더 스케줄러.
- resources.ts: 공유 geometry/material/texture 중복 해제 방지 및 InstancedMesh 해제.
- index.html/style.css: JavaScript 초기화 전에도 존재하는 안내와 반응형 화면.

JS 초기 entry에는 Three를 넣지 않고 viewer를 동적 import한다. 초기 HTML의 상태·도움말을 먼저 볼 수 있지만, 이것을 사용자 기기에서 측정한 첫 화면 성능 수치라고 주장하지는 않는다.

## 모델 계약

glTF 좌표는 미터 단위 Y-up이다. Blender의 Z-up 변환은 exporter가 담당한다. waypoint는 모델 안의 `Waypoint_*` node이며 node world position을 카메라 위치로 사용한다. extras.label은 표시명, extras.target은 glTF world 좌표[x,y,z], extras.accuracy는 검증 여부다. target이 없으면 전체 bounds 중심을 사용한다. 검증표시가 없는 지점은 UI에 근사로 표시한다. 24개를 넘는 waypoint는 표시하지 않고 label 길이를 제한한다.

모델 worker가 전달한 예상 waypoint는 전체전경, 광장, 온누리아트홀 입구, 로비다. 원점과 북방향이 실측 검증된 것이 아니므로 모든 지점을 근사로 표시한다. viewer는 orbit 및 지정 시점 이동 기능이다. 실제 사람의 발이 바닥에 붙는 물리보행, 건물충돌, 통행가능 검증을 완료했다고 하지 않는다. 추후 충돌기능을 구현한다면 별도 검증해야 한다.

GLB header/version/길이/JSON chunk를 검사하고 buffers/images의 외부 URI를 거부한다. 따라서 GLB 내부에서 임의 외부 texture나 bin을 추가 요청하지 않는다. 모형은 embedded GLB여야 하며, 압축 decoder도 이번 버전에는 추가하지 않는다. 필요한 경우 모델 변환 및 decoder 정책을 함께 변경해야 한다.

## 낮은 기기 부담을 위한 결정

장면에 자동 회전이나 지속 애니메이션이 없으므로 무조건 requestAnimationFrame을 돌릴 이유가 없다. controls change, resize, model ready, 품질 변경 등에만 한 프레임을 요청한다. 같은 턴에서 여러 요청이 들어와도 대기 프레임은 하나다. Orbit damping도 꺼서 정지한 장면에 반복 렌더가 필요하지 않게 했다.

DPR은 desktop 자동 최대1.5, 저사양/터치 환경 최대1, 상호작용 중 최대1, 절전0.8로 제한한다. 브라우저 실제 device ratio보다 높이지 않는다. 상호작용 종료140ms 뒤 자동 정책으로 돌아온다. 이는 해상도 정책이지 실측 FPS 개선 결과가 아니다. WebGL antialias와 shadow map은 초기 버전에서 사용하지 않는다. 모델의 외관 디테일을 코드로 삭제하지 않으며 모델 품질·메모리 비용은 실제 GLB 검사와 함께 평가해야 한다.

합성 스케줄러 검사에서 invalidate200회가 실제 callback1개로 합쳐지고, 이후 추가 idle callback은0개다. 이 숫자는 스케줄러 단위검사이며 실제 GPU 렌더 시간이나 휴대폰 배터리 측정치가 아니다. 빌드 출력의 raw/gzip 크기도 네트워크 지연이나 사용자 체감 시간을 대신하지 않는다.

## 입력·접근성·화면

마우스 드래그는 회전, 휠은 확대, 오른쪽 드래그는 이동이다. 모바일 OrbitControls의 한손/두손 입력을 사용한다. canvas는 키보드 focus를 받고 방향키 이동, +/− 확대, Home 전체 보기를 지원한다. 버튼·선택 필드는 focus outline을 제공하고 상태는 aria-live polite다. 품질 옵션은 자동/절전 두 개뿐이다.

사용자가 모형 근사 범위를 알 수 있도록 근거·한계 details를 상시 제공한다. WebGL 실패·HTTP 오류·모델 형식 오류는 가짜 성공 화면 대신 읽을 수 있는 오류로 나타난다. JavaScript가 꺼진 경우 noscript 안내가 남는다. 움직임은 사용자의 조작으로만 발생하며 자동 카메라 연출은 없다.

## 수명과 실패 처리

context loss listener는 모델 요청 전에 등록한다. 실패하면 fetch를 abort하고 스케줄러와 controls/observer/listener를 정리하며, 다음 재시도는 새 renderer를 만든다. GLTF parse가 완료되기 전에 종료되었다면 늦게 도착한 scene도 해제한다. 공유 texture/material/geometry는 Set으로 한 번만 dispose하고 InstancedMesh는 instance buffers를 위한 dispose를 별도로 호출한다. renderer는 자산 뒤에 정리한다.

숨겨진 문서에서는 controls와 렌더를 정지하고, 다시 보이면 resize 및 렌더를 요청한다. BFCache의 persisted pagehide는 최종 종료로 간주하지 않는다. non-persisted 최종 departure에서만 teardown한다. 이 구조는 BFCache로 뒤로 돌아왔을 때 화면을 영구 종료해 버리는 이전 유형의 회귀를 피하기 위한 것이다.

## 테스트 및 한계

단위검사는 단일 모델 URL/건물생성 없음, embedded GLB 검사, DPR 상한, 세로화면 카메라 fit, waypoint 좌표 유효성, 요청병합·종료 후 렌더 차단, 실제 Three 공유자원/instance 해제를 포함한다. 실제 `public/models/sycc.glb`가 없는 초기 실행에서는 모델 검사를 명시적으로 skip한다. 모델을 받은 후에는 이 검사가 자동으로 활성화된다.

root의 별도 GLB 검사 도구는 `npm run test:model`, 실제 파일 검사는 `npm run inspect:model`로 연결했다. 이 도구들의 작성자는 root이며 viewer 변경과 구분한다. 일반 test 실행은 tsx CLI의 sandbox IPC pipe 오류를 피하기 위해 Node의 `--import tsx --test` 표준 loader 경로를 사용한다. OS 보안 설정을 바꾸지 않았다.

아직 이 기록만으로 휴대폰 GPU 속도, 실제 브라우저 렌더 정상, 건축물 현실 일치 또는 배포 성공을 확인할 수는 없다. 실제 모델과 배포 환경에서 그 항목을 따로 확인해야 한다. 번들 크기 경고가 있으면 그대로 남기고, 무의미하게 경고 기준만 높여 숨기지 않는다.

## 재현과 파일

Node22.12 이상에서 `npm ci`, `npm run build`, `npm test`를 실행한다. root의 inspector도 --import tsx를 사용하여 선언한 Node22.12 범위에서 TypeScript 직접 실행 지원 차이에 의존하지 않도록 했다. 실제 검증 머신은 Node24다. 빌드 산출물은 dist이며 공개 모델은 dist/models/sycc.glb로 복사된다. 원본 모델은 public/models/sycc.glb로 제공되어야 한다. model이 없는 빌드도 UI 초기 점검을 위해 허용하지만, 실제 사용자는 오류 안내를 보게 된다.

package-lock.json은 공식 npm 설치 결과다. node_modules/dist/.npm-cache는 커밋하지 않는다. 구현 단계에서 생성한 제품 파일 목록은 별도 인계 메시지에 정확하게 기록한다.

## 초기 GLB 인계 후 검사 결과

모델 담당자가 제공한 초기 GLB264,536바이트를 받아 같은 테스트를 다시 실행했다. 이번에는 skip0, 총9개가 모두 통과했다. 추가 실제모델 검사는 Three.GLTFLoader.parseAsync로 파일을 해석하고, 비어 있지 않은 bounds, 유효한 좌표, label/target/approximate 속성을 가진 waypoint를 확인한다. GPU 없이 파서와 scene graph를 검증한 것이며 브라우저 실제 렌더 성공과 동일하지 않다.

최종 초기 빌드 출력은 HTML2.11KB(gzip1.26KB), CSS2.54KB(gzip1.08KB), 초기JS3.36KB(gzip1.63KB), lazy viewer632.42KB(gzip161.96KB)다. viewer500KB 경고는 그대로 남겼다. 이 숫자는 해당 빌드의 번들 크기이며 모델 다운로드264,536바이트와 구분한다. strict typecheck 및 build는 성공했다. 상태/UI는 모델 담당자의 '초기 블록아웃·과거사진·근사치수·현재성미검증' 범위에 맞춰 명확하게 표시한다.

## M2 후 시각·모바일 좁은 개선

배경은 불투명 단색에서 투명 canvas와 정적 CSS 하늘 gradient로 바꿨다. 위쪽 청색에서 수평선 근처 밝은 색으로 이어지지만 카메라 방향에 따라 변하는 실제 하늘 모델은 아니다. HDR 환경맵, 유리의 하늘 반사, 물리적으로 정확한 광택을 구현했다고 주장하지 않는다. 기존 hemisphere/directional 조명과 모델 재질은 보존했다. 추가 이미지 다운로드·장면 geometry·애니메이션 loop는 없다. alpha compositing 비용은 기기별로 다를 수 있어 GPU 성능 향상을 주장하지 않는다.

모바일에서 여섯 waypoint가 여러 줄로 펼쳐져 장면을 가리는 문제를 줄이기 위해 한 줄 가로 스크롤로 바꿨다. 버튼은 native button과 키보드 focus를 유지하고 outline이 잘리지 않도록 여백을 둔다. 전체 패널 높이는 46svh까지이며 작은 화면·큰 글꼴에서도 세로 스크롤로 나머지 내용을 읽을 수 있게 했다. 이미 '(근사)'를 포함한 모델 label에는 다시 '· 근사'를 붙이지 않는다. 증거 표시를 삭제하는 것이 아니라 중복만 막는다.

라벨 함수는 별도 작은 모듈로 분리했다. 처음에는 기존 policy 모듈에 넣었으나 초기 entry가 GLB 검증 코드까지 함께 가져오는 빌드 변화가 관찰되어 분리했다. 렌더러·검증 코드는 지연 viewer에 남는다. DPR 상한, idle frame 0, context loss 및 종료 처리에는 변화가 없다.

검증 모델은 M2 1,268,656바이트, SHA256 `bfc49c4eade9bc081956207683ed171aaef950fee226120fe0bd931ff8dec342`이다. 실제 GLTFLoader bounds/waypoint 검사 포함 11/11 테스트가 skip 없이 통과했고 strict typecheck 포함 production build도 통과했다. root의 모델 검사 도구 회귀도 통과했다. 실제 브라우저 screenshot 및 모바일 GPU 실측은 이번 수정에서 수행하지 않았으므로 CSS 계약·파서·빌드 검증과 구분한다. M3는 아직 이 결과에 포함하지 않는다. 산출물 크기는 동봉 build.txt에서 확인하며 500KB viewer 경고를 그대로 유지했다.
