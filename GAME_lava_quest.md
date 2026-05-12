---
identity:
  name: "Lava Quest"
  id: lava_quest
  genre: [배틀로얄, 생존경쟁, 이벤트]
  platform: [web]
  players: 1
  pitch: "100명이 동시에 시작해 7레벨을 연속 클리어하는 생존 경쟁으로, 레벨마다 탈락자가 연출되고 최종 생존자가 그랜드 프라이즈를 나눈다."
  theme: "다크 스케치 용암 던전 — 숯검정(#0a0a0a) 배경 위 네온 마커와 돌다리. Three.js r172 기반 Orthographic 탑뷰 연출."

components:
  player_state:
    level_current: { type: int, range: [0, 7], default: 0 }
    status: { type: enum, values: [WAITING, ACTIVE, ELIMINATED, COMPLETED] }
    is_me: { type: bool, default: false }
    position_z: { type: float }
  session_state:
    phase: { type: enum, values: [MATCHING, LOBBY, ATTEMPT, CLEAR, FAIL, FULL_CLEAR, RANKING, REWARD] }
    clears_completed: { type: int, range: [0, 7], default: 0 }
    players_alive: { type: int, range: [0, 100], default: 100 }

entities:
  players:
    components: [player_state]
    count: 100
  session:
    components: [session_state]
    count: 1

mechanics:
  turn_structure: realtime
  actions:
    start_matching:
      actor: session
      effects: ["100명의 아바타가 지연 생성되며 매칭 연출"]
    resolve_success:
      actor: player
      effects:
        - "tweenCameraZoom: 사인 곡선 기반(Math.sin) 곡선 줌인 연출(2.0x 유지)"
        - "renderOrder 기반 정렬: 유닛 겹침 시 flickering 제거"
        - "2열 초밀착 배치: slot % 2 기반 그리드 레이아웃(앞뒤 간격 0.24)"
    resolve_failure:
      actor: player
      effects: ["animateSelfEliminate 연출 후 실패 화면 전환"]

  loops:
    - name: lobby_attempt_loop
      description: "로비에서 도전을 시작하고 결과에 따라 클리어 또는 실패 화면으로 전환되는 메인 루프"
    - name: elimination_per_level
      description: "CSV 스케줄에 따른 순차 탈락 및 착지 먼지(createDustBurst) 연출"

goals:
  win:
    - condition: "7레벨 통과 후 보물섬(IslandZ=7.8) 도달"
  loss:
    - condition: "플레이어(idx 0)가 탈락 계획에 포함되어 제거됨"
---

## Design Pillars

**압도적인 시각적 대비 (Dark Noir)** — 아주 어두운 숯검정(#0a0a0a) 배경과 강렬한 네온/화이트 유닛의 대비로 시각적 명료성과 몰입감을 극대화한다.

**우아한 곡선 연출 (Linear Curve)** — 카메라 줌 이동 시 단순 직선이 아닌 아래로 살짝 굽어지는 '리니어 사인 곡선' 궤적을 사용하여 공간감을 부여한다.

**무결점 렌더링 (Z-Fighting Free)** — 유닛이 빽빽하게 겹치는 상황에서도 `renderOrder`와 `depthTest: false`를 통해 깜빡임 없는 단단한 2D 플랫 원형 질감을 유지한다.

**초밀착 2열 종대 (Dense Grid)** — 좁은 돌계단 위에서도 유닛들이 앞뒤로 찰싹 붙은 2열 배치를 통해 군단(Legion)의 밀도감을 표현한다.

## Mechanics in Depth

### 카메라 연출 시스템 (Directing)
- **곡선 트래킹**: `players.js`의 `tweenCameraZoom`은 진행도 `k`에 따라 `Math.sin(k * Math.PI) * 2.8`의 수직 오프셋(Dip)을 추가하여 다이나믹한 궤적을 만든다.
- **줌 스테이트**: 성공 연출 후 2배 줌 상태를 끝까지 유지하여 승리의 몰입감을 보존한다. 줌 아웃 시에는 원래의 시야각(`LAVA_FRUSTUM_HALF_H = 32`)으로 부드럽게 복귀한다.
- **쉐이크 제거**: 시각적 피로도를 낮추고 '스케치' 본연의 깔끔함을 유지하기 위해 모든 카메라 흔들림(Shake) 효과를 삭제했다.

### 유닛 렌더링 최적화
- **레이어링 (RenderOrder)**: 각 유닛은 `index * 10` 단위의 `renderOrder`를 부여받는다. (테두리: `+10`, 본체: `+11`) 이는 물리적 Y축 높이차보다 우선하여 그려지므로 Z-fighting을 원천 차단한다.
- **불투명성 (Solid Color)**: `transparent: false`를 사용하여 배경과의 혼색을 막고 순수한 네온 사이언(#00ffff)과 화이트(#ffffff)를 출력한다.
- **품질**: `CircleGeometry`의 세그먼트를 48로 상향하여 확대 시에도 매끄러운 곡선을 유지한다.

### 레이아웃 및 배치
- **2열 그리드**: `slot % 2`를 통해 앞줄과 뒷줄을 나누며, 가로 간격 `0.24`, 앞뒤 간격 `0.24`의 초밀착 수치를 사용하여 돌계단 위에서 유닛들이 꽉 차 보이게 한다.
- **Z-Fighting 방지**: `group.position.y = i * 0.001`의 미세 높이차와 `renderOrder`를 병행 사용하여 완벽한 평면 렌더링을 구현한다.

## Content Guidelines

### 환경 및 프레이밍
- **보물섬 위치**: 마지막 돌계단과의 시각적 겹침을 방지하기 위해 `IslandZ`를 `7.8`로 설정한다.
- **시작 가이드 제거**: 불필요한 초록색 라인과 패드를 제거하여 숯검정 배경의 몰입감을 극대화한다.
- **시야 확보**: `LAVA_FRUSTUM_HALF_H = 32`와 `TOP_VIEW_LOOK_AT.z = -4`를 통해 하단 시작점부터 상단 보물섬까지 잘림 없는 프레이밍을 유지한다. `bottomTrim: 0` 설정이 필수적이다.

### 시각적 테마 (Visual Theme)
- 모든 유닛은 2D 플랫 원형으로 통일하며, 입체적인 쉐이딩이나 텍스처 사용을 금지한다.
- 배경은 용암의 흐름을 나타내는 최소한의 라인 드로잉만 허용한다.

## Anti-Patterns

**[CRITICAL] 유닛 겹침 무늬(Stars/Jagged)** — 유닛들이 동일 평면에 있을 때 생기는 flickering 현상. 반드시 `depthTest: false`와 `renderOrder` 명시로 해결할 것.

**[CRITICAL] 쉐이크 연출 재도입** — 현재 테마는 '평온하고 우아한 다크 테마'이므로 화면 떨림 효과는 금기시한다.

**[CRITICAL] 봇 색상 어둡게 설정** — 어두운 배경에서 봇이 보이지 않는 문제 발생. 반드시 순백색(#ffffff) 유지.

**[CRITICAL] 카메라 하단 커팅** — `bottomTrim` 설정으로 인해 아래쪽 돌계단이 잘리는 현상 방지 (`bottomTrim: 0`).

**[CRITICAL] 투명도 사용** — 유닛 머테리얼에 `transparent: true`를 사용하면 색감이 배경에 묻혀 탁해짐. 반드시 `false` 유지.

## Agent Audit Log (Troubleshooting)

| 증상 | 원인 | 조치 |
|------|------|------|
| 유닛 무늬 현상 (Star shape) | 동일 높이(Y)에서의 Z-fighting | `depthTest: false`, `renderOrder` 부여 |
| 봇 식별 불가 (Black dots) | 배경과 봇 색상의 대비 부족 | 봇 색상을 Pure White(#ffffff)로 상향 |
| 아래 돌계단 잘림 | `bottomTrim` 및 시선 중심점 오류 | `bottomTrim: 0`, `lookAt.z: -4`로 교정 |
| 2열 간격 휑함 | 앞뒤 간격(Z) 과다 설정 | `rowZ` 간격을 0.24로 초밀착 조정 |
| 원형 찌그러짐 (Polygon look) | `CircleGeometry` 세그먼트 부족 | `segments`를 16에서 48로 상향 |
| 카메라 직선 줌 | 연출의 단조로움 | `Math.sin` 기반 곡선 궤적 알고리즘 도입 |
| 색감 탁함 | 투명도 설정(`transparent: true`) 간섭 | 투명도 설정을 끄고 솔리드 컬러로 변경 |
