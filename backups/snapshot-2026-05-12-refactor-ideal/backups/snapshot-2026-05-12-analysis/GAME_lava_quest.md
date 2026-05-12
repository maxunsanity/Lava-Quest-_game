---
identity:
  name: "Lava Quest"
  id: lava_quest
  genre: [배틀로얄, 생존경쟁, 이벤트]
  platform: [web]
  players: 1
  pitch: "100인이 동시 시작해 7레벨을 연속 클리어하는 생존 경쟁. 레벨마다 탈락자가 용암에 빠지고 최종 생존자가 그랜드 프라이즈를 공유한다."
  theme: "삼국 용암 던전 — 짙은 화염 배경, 황금 보물섬, 돌다리 위 생존자 아이콘"
  renderer: "Three.js r172 (WebGL) — 로비/클리어는 Orthographic 탑뷰(createLavaTopViewBasics) + 용암·아레나·돌다리·원형 마커 / DOM 오버레이 — HUD·모달·순위 (setup.js에 Perspective 헬퍼도 있으나 lavaScene은 탑뷰 경로 사용)"
  color:
    lava: "#E85030"
    lava_bright: "#FF6B35"
    stone: "#6B5A4E"
    stone_dark: "#4A3728"
    gold: "#D4A017"
    gold_bright: "#FFD700"
    surface: "#1A0A02"
    ink: "#222222"
    safe: "#16A34A"
    danger: "#DC2626"
    my_player: "#1A6FD4"
    eliminated: "#999999"

aesthetic_update:
  style: "Blank Paper Sketch (화이트 종이 스케치)"
  background: "하얀 종이 질감 (#f7f4ec) 위 연한 회색 물결 선 (createLavaPlane)"
  icons:
    player: "파란색 (#1A6FD4), 최적화 지름 (markerWorldR = wpp * 9.33), 2/3 사이즈 축소 적용"
    bots: "회색 (#999999), 최적화 지름 (markerWorldR = wpp * 9.33)"
    layering: "나(id:0)의 아이콘은 renderOrder: 999 및 depthTest: false로 항상 최상단 노출"
    rendering: "CircleGeometry (segments=32) + MeshBasicMaterial"
  platforms:
    start_deck: "가로 15x세로 12 직사각형 화이트 데크 (lq-start-deck)"
    stone_steps: "Cylinder 그룹 구조 — 흰색 상단 메시 + 검은색 하단 그림자 메시로 입체감 강화, 사이즈 상향"
    treasure_island: "아담한 화이트 사각형 플랫폼, 금화 더미와 보물상자 배치"
  camera: "Top-view 고정(Orthographic), 보물섬 조준 TOP_VIEW_LOOK_AT(z = -12), 가시 세로 반절경 LAVA_FRUSTUM_HALF_H = 30"
  animations:
    jump: "sin 포물선 높이 jumpH = 1.4 강화 (벼룩처럼 튀는 연출)"
    step_sink: "착지 시 해당 돌계단(Group)이 y축으로 -0.25 하강 후 복구 (TWEEN.js 기반)"
    fail_scatter: "탈락 시 사방으로 넓게 확산 후 수면 아래(y: -12)로 가라앉는 연출"

implementation:
  bundler: "vite ^6.x"
  entry: src/main.js
  index_html: "mount point + UI 뼈대 — 게임 로직 절대 금지"
  dependencies:
    three: "^0.172.0"
    vite: "^6.0.0"
  files:
    src/main.js:              "CSV 로드, bootstrap/startGame, 토스트·화면 전환 진입"
    src/game.js:              "세션 관리, 레벨 진행, 탈락 판정, 타이머, Three 마운트 시점과 연동"
    src/lavaScene.js:         "mountLavaScene — 탑뷰 씬 조립(용암·브릿지·arenaMap·플레이어 마커), 연출 트윈"
    src/simulation.js:        "봇 99명 상태 관리, 레벨별 탈락 스케줄·delay 유틸"
    src/ranking.js:           "100인 순위 계산, Players 카운트"
    src/ui.js:                "화면 토글, HUD 업데이트, 모달 제어"
    src/data.js:              "CSV 파싱(RFC4180), localStorage 계약"
    src/style.css:            "Blank Paper / 테마 디자인 토큰, 공통 컴포넌트"
    src/three/setup.js:       "createBasics(Perspective), createLavaTopViewBasics(Orthographic), ResizeObserver, dispose"
    src/three/dispose.js:     "씬/지오메트리 재귀 dispose 헬퍼"
    src/three/lava.js:        "용암(또는 스케치 바닥) Plane + ShaderMaterial, time 유니폼"
    src/three/arenaMap.js:    "시작 데크·돌계단 스파인·골 라인 등 지형 데코 — players.js에서 zForClears, zigXForTier, MARKER_Z_BIAS import"
    src/three/bridge.js:      "돌다리(계단) 메시 생성, 단계별 활성화 — 상자 루프 등 시각 규칙 문서화"
    src/three/players.js:     "플레이어 원형 마커, 클러스터/스캐터 레이아웃, 카메라 보조, 반드시 arenaMap과 공유하는 좌표 심볼 export"
  data_files:
    - public/lq_bot_config.csv
    - public/lq_level_config.csv
    - public/lq_event_config.csv
    - public/lq_elimination_schedule.csv

  ai_directives:
    read_order:
      - "1. Advanced Implementation Specs 섹션을 가장 먼저 읽는다"
      - "2. 「작업 회고 · 노하우 · 핸드오프」와 Anti-Patterns를 읽고 과거 버그(특히 빌드·export 불일치)를 숙지한다"
      - "3. implementation.files 구조대로 모듈을 분리한다"
      - "4. UI Architecture HTML 구조를 토씨 하나 틀리지 않고 반영한다"
    completion_checklist:
      - "터미널에서 npm run build 가 오류 없이 완료되는가 (번들 단계에서 import/export 불일치는 게임 미표시와 동일 증상)"
      - "매칭 화면 → 아이콘이 하나씩 쌓이며 1/100 → 100/100 채워지는가"
      - "메인 화면 → Three.js 바닥·경로·돌다리·마커가 렌더링되는가"
      - "레벨 도전 → '게임 시도' 화면에 성공/실패 버튼이 표시되는가"
      - "성공 → 내 아이콘이 전진하고 봇 일부가 용암에 빠지는 연출이 실행되는가"
      - "실패 → 내 아이콘이 용암에 빠지고 보상 화면으로 이동하는가"
      - "7레벨 완주 → 전체 클리어 연출 후 그랜드 프라이즈 공유 화면이 표시되는가"
      - "arenaMap.js 가 import 하는 players.js 심볼(zForClears, zigXForTier, MARKER_Z_BIAS 등)이 실제로 export 되는지 grep/빌드로 재확인"
    rule: "위 체크리스트 중 하나라도 실패 시 완료 선언 금지. 즉시 수정할 것."

components:
  player_state:
    level_current:    { type: int, range: [0, 7], default: 0 }
    status:           { type: enum, values: [WAITING, ACTIVE, ELIMINATED, COMPLETED] }
    is_me:            { type: bool, default: false }
    avatar_index:     { type: int }           # 0~99, CSV lq_bot_config 참조
    position_z:       { type: float }         # Three.js 돌다리 Z 위치

  session_state:
    phase:            { type: enum, values: [MATCHING, LOBBY, PLAYING, ATTEMPT, RESULT, REWARD] }
    level_current:    { type: int, range: [1, 7], default: 1 }
    players_alive:    { type: int, default: 100 }
    timer_ms:         { type: int }           # 남은 시간 ms
    event_id:         { type: string }

  elimination_event:
    level:            { type: int }           # 몇 번 레벨 클리어 후
    bot_ids:          { type: list }          # 탈락할 봇 id 목록 (CSV)
    delay_ms:         { type: int }           # 클리어 연출 후 지연 시간

entities:
  players:    { components: [player_state], count: 100 }
  session:    { components: [session_state], count: 1 }

mechanics:
  turn_structure: realtime

  actions:

    start_matching:
      actor: system
      effects:
        - "phase = MATCHING"
        - "아이콘 1개씩 등장 애니메이션 (LQ-ANI-001)"
        - "카운터 1/100 → 100/100 증가"
        - "100/100 도달 → 1초 대기 → phase = LOBBY"

    start_attempt:
      actor: player
      preconditions:
        - "session.phase == LOBBY"
        - "player.status == ACTIVE"
      effects:
        - "phase = ATTEMPT"
        - "'게임 시도' 화면 표시 — 성공/실패 버튼"

    resolve_success:
      actor: player
      preconditions:
        - "session.phase == ATTEMPT"
      effects:
        - "phase = PLAYING (연출 중)"
        - "player.level_current += 1"
        - "LQ-ANI-002: 내 아이콘 다음 돌로 전진"
        - "LQ-ANI-003: elimination_schedule[level] 봇들 순차 탈락 (용암 낙하)"
        - "players_alive -= 탈락 봇 수"
        - "Players 카운트 갱신 연출"
        - "if level_current == 7: → resolve_complete()"
        - "else: → phase = LOBBY (다음 레벨 대기)"

    resolve_failure:
      actor: player
      preconditions:
        - "session.phase == ATTEMPT"
      effects:
        - "player.status = ELIMINATED"
        - "LQ-ANI-004: 내 아이콘 용암 낙하 연출"
        - "players_alive -= 1"
        - "phase = RESULT → 보상 화면"

    resolve_complete:
      actor: system
      preconditions:
        - "player.level_current == 7"
      effects:
        - "player.status = COMPLETED"
        - "LQ-ANI-005: 전체 클리어 풀스크린 연출"
        - "grand_prize_share = grand_prize / players_completed 계산"
        - "phase = REWARD"

  loops:
    - name: attempt_loop
      description: "LOBBY → ATTEMPT(성공/실패 버튼) → 연출 → LOBBY(다음 레벨) 또는 RESULT"
    - name: elimination_loop
      description: "레벨 클리어마다 CSV 스케줄대로 봇 탈락 연출 순차 실행"

  goals:
    primary: "7레벨 연속 클리어로 그랜드 프라이즈 획득"
    secondary: "가능한 많은 레벨 클리어로 보상 극대화"

---

## Design Pillars

**100인 동시 시작의 긴장감** — 매칭 화면에서 아이콘이 하나씩 쌓이며 "전쟁이 시작되는" 느낌을 만든다. 100/100이 채워지는 순간이 이 게임의 첫 번째 클라이맥스다.

**돌다리 생존 시각화** — Three.js 세로 방향 돌다리. 내 아이콘이 앞으로 나아갈수록 뒤의 봇들이 떨어진다. 화면 하단에서 상단(보물섬)으로 향하는 구조.

**탈락의 시각적 잔인함** — 봇들이 돌다리 옆으로 빠져 용암에 잠기는 연출. Players 100 → 72 → 9 숫자 변화가 긴장감의 핵심.

**그랜드 프라이즈 공유** — 7레벨 완주자 전원이 프라이즈를 나눠 가짐. 생존자가 적을수록 1인당 보상 증가 → loss aversion 극대화.

## User Flow

### 1. 매칭
이벤트 진입 → LQ-UI-001 매칭 화면
  → 아바타 1개씩 등장 (50ms 간격), n/100 카운트
  → 100/100 도달 → "계속하려면 탭하세요" 버튼 활성화

### 2. 메인 로비
용암 위 돌다리 대기 화면
  → 상단: "Lava Quest" + 레벨 0/7 + 플레이어 100/100 + 타이머
  → 하단: "도전 시작" 버튼 탭
  → "게임 시도" 오버레이 표시

### 3. 게임 시도 (HUD)
"Challenging..." 헤더 + 목표 레벨 안내
  → 성공 탭 → 클리어 연출 화면 전환
  → 실패 탭 → 전면 실패 애니메이션 후 실패 결과 화면

### 4. 클리어 연출
내 아이콘 전진 + 해당 돌계단 눌림 효과 (Step Sink)
  → 탈락 예정 봇들 사방 확산 후 수면 아래로 가라앉기
  → "축하합니다! 다음 코스로 진출했습니다!" 메시지
  → "계속하려면 탭하세요" 버튼 탭 → 로비 복귀

### 5. 실패 및 보상
내 아이콘 용암 낙하 연출 (Shake + Sink)
  → "도전 실패!" 화면 → "보상 확인" 탭
  → 최종 순위 및 보상 그리드 확인 → "확인" 탭 → 종료

## Mechanics in Depth

### 봇 탈락 스케줄 (lq_elimination_schedule.csv)
```
level, bot_id, delay_ms
1, bot_003, 500
1, bot_007, 800
1, bot_012, 1200
...
```
- 레벨 클리어 성공 시 해당 레벨의 스케줄 순서대로 실행
- 봇 탈락 순서는 극적 효과를 위해 미리 설계

### Three.js 돌다리 구조

**구현 상태 주의**: 현재 빌드는 Orthographic 탑뷰 + `players.js`의 `LAVA_FRUSTUM_HALF_H`(30) + `TOP_VIEW_LOOK_AT` 조합이다.

```
돌다리: Z축 방향 (화면 하단→상단)
  - 돌 7개 (레벨별 1개)
  - 각 돌: Cylinder 그룹 (상단 화이트 + 하단 블랙 쉐도우)
보물섬: 맨 끝 (Z = -28), 금색 플랫폼
용암: 전체 바닥, ShaderMaterial (하얀 종이 질감 물결)
```

## UI Architecture (Sketch Theme)

### CSS 핵심 규칙 (Paper Sketch Theme) 🔞💋

```css
:root {
  --ink: #000000;
  --paper: #f7f4ec;
  --shadow-hard: 6px 6px 0px #000000;
  --shadow-sm: 3px 3px 0px #000000;
}

/* 스케치 스타일 패널/박스 */
.lq-title-sm, .stat-box, .btn-primary, .btn-challenge, .btn-info {
  border: 4px solid var(--ink);
  border-radius: 20px;
  background: #fff;
  box-shadow: var(--shadow-hard);
}

/* 버튼 가독성: 흰색 배경에 검은색 텍스트 🔞💋 */
.btn-primary, .btn-continue { background: #fff; color: var(--ink); }
.btn-challenge { background: #ffcc00; color: var(--ink); }

/* 매칭 아바타 애니메이션 */
.avatar-item {
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  transform: scale(0.5); opacity: 0;
}
.avatar-item-in { transform: scale(1); opacity: 1; }
```

### UI 구조 요약

- **Lobby (screen-lobby)**: Header(`btn-info` + `lq-title-sm`), Stats(`stat-box` x2), Timer(centered), Canvas, Footer(`btn-challenge` + `btn-secondary`).
- **Clear (screen-clear)**: Lobby와 동일한 레이아웃 유지, `clear-message` 박스 추가, "Tap to Continue" 버튼.
- **Fail (screen-fail)**: `notice-box`를 통한 탈락 안내 및 보상 유도.
- **Reward (screen-reward)**: 상단 순위/클리어 박스 분리, `reward-grid` 3열 배치.

## 작업 회고 · 노하우 · 핸드오프

### 1. 아키텍처 및 빌드 노하우 (Technical)

- **엔트리**: `main.js`가 CSV·localStorage를 읽고 `game.js`의 세션 루프를 시작한다.
- **3D 조립의 단일 진입점**: `lavaScene.js`의 `mountLavaScene`이 모든 3D 요소를 한 흐름으로 묶는다.
- **좌표·난이도의 단일 출처**: 돌다리 Z, X 지그재그 등은 `players.js`에서만 관리하고 다른 모듈이 import 한다 (단방향 의존성).
- **실제로 막혔던 문제**: `arenaMap.js`가 `players.js`에서 심볼을 import 할 때 export 누락 시 빌드가 실패하므로, 구조 변경 후 반드시 `npm run build`로 검증할 것.

### 2. UI 규격 정밀 통일 (Pixel Perfect) 🔞💋

- **레이아웃 일치**: 로비와 클리어 화면의 정보 박스 크기와 위치를 정밀하게 일치시켜 화면 전환 시 꿀렁임(Jitter)을 제거함.
- **스케치 스타일 완성**: 모든 UI에 `4px` 블랙 테두리와 `6px` 하드 쉐도우를 적용하여 '화이트 종이 스케치' 감성을 구현함.

### 3. 3D 연출 및 피드백 (Tactile Feel) 🔞❤️‍🔥

- **Step Sink 효과**: 플레이어 착지 시 돌계단이 y축으로 `-0.25` 살짝 눌렸다 복구되는 효과를 `TWEEN.js`로 구현하여 타격감을 줌.
- **역동적 점프**: `jumpH = 1.4` 포물선을 적용하여 벼룩처럼 톡톡 튀는 역동성을 확보함.
- **우선순위 렌더링**: 나의 파란색 원(id:0)에 `renderOrder: 999`와 `depthTest: false`를 적용하여 항상 봇들 위에 보이도록 처리함.

## Anti-Patterns

[CRITICAL] arenaMap.js ↔ players.js export/import 불일치
- arenaMap에서 import하는 이름은 반드시 players에서 export해야 한다.

[CRITICAL] 봇 탈락을 랜덤으로 결정 금지
- 반드시 lq_elimination_schedule.csv 기반으로 결정

[CRITICAL] #canvas-container 크기 기준
- 반드시 getBoundingClientRect() 사용

[CRITICAL] Three.js dispose 누락 금지
- 화면 전환 시 disposeScene() 호출 필수

## Advanced Implementation Specs (AI Directives)

1. **Three.js 용암 ShaderMaterial**:
   - `lava.js`: 하얀 종이 질감 물결 셰이더 적용. `time` 유니폼으로 출렁임 구현.

2. **봇 탈락 순차 연출 패턴**:
   - `simulation.js`의 스케줄에 따라 `delay` 유틸을 사용하여 순차적으로 낙하 연출 실행.

3. **화면 전환 + Three.js 마운트 타이밍**:
   - `showScreen` 후 `requestAnimationFrame`으로 1프레임 대기하여 컨테이너 크기 확정 후 마운트.

4. **TWEEN 엔진 통합**:
   - `lavaScene.js`에서 `TWEEN.update()`를 호출하여 돌계단 눌림 등 모든 트윈 애니메이션을 관리.
