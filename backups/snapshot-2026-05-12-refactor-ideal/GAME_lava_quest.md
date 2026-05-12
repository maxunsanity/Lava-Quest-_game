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
  style: "Blank Paper Sketch (화이트 종이 스케치) — Three / 용암 씬. 2D HUD는 YAML `dom_shell` + 본문 「2D UI 셸」절의 서술이 우선한다. 마크업/CSS 전문은 이 MD에 두지 않는다."
  background: "하얀 종이 질감 위 연한 회색 물결 선 (createLavaPlane)"
  icons:
    player: "파란색 (#1A6FD4), 14px 지름 (markerWorldR = wpp * 7.0)"
    bots: "회색 (#999999), 14px 지름"
    rendering: "CircleGeometry (segments=32) + MeshBasicMaterial"
  platforms:
    start_deck: "가로 15x세로 12 직사각형 화이트 데크 (lq-start-deck), PLAYER_START_Z 기준 배치"
    stone_steps: "시크한 검은색 (#0a0a0a), 돌계단 테두리 포함"
    treasure_island: "아담한 화이트 사각형 플랫폼, 금화 더미와 보물상자 배치"
  camera: "Top-view 고정(Orthographic), 보물섬 조준 TOP_VIEW_LOOK_AT(z = -12), 가시 세로 반절경 LAVA_FRUSTUM_HALF_H = 28.5 (코드 기준; 기획 변경 시 players.js와 동기화)"

# 2D HUD 셸 — Three.js 위에 얹는 DOM. 다음 AI는 이 블록과 본문 「2D UI 셸」절을 함께 만족시키면 동일한 패널 형태가 나온다.
dom_shell:
  codename: "Panel Comic Shell (Archery Arena 계열)"
  intent: "회색 바깥 배경 + 390×844 종이 프레임 + 두꺼운 검은 테두리 + 하드 섀도. 양궁 아레나류 미니게임과 동일한 시각 언어."
  single_source_of_truth: "구체 마크업·인라인 스타일은 명세 MD가 아니라 현재 프로젝트의 정적 엔트리 페이지에만 둔다(중복 금지)."
  fonts: "Outfit — Google Fonts `family=Outfit:wght@400;700;900`"
  root_tokens:
    ink: "#000000"
    paper: "#f7f4ec"
    shadow_hard: "6px 6px 0 #000"
    shadow_sm: "3px 3px 0 #000"
  chrome:
    body_bg: "#ddd"
    app: "390×844, margin 0 auto, border 6px solid var(--ink), background var(--paper), flex column"
    screen: "absolute inset 0, padding 24px, z-index 10, background var(--paper)"
  matching_avatars:
    container: ".avatar-stack — 흰 패널 + 4px 테두리, height 420px, flex-wrap, gap 6px"
    dot: "28×28px 원, border 2px solid ink, transition 등장"
    me: "배경 #1a6fd4, 약한 글로우"
  fx_layer: "#lq-fx-mount — absolute inset 0, z-index 1000, pointer-events none (풀스크린 실패 연출 임시 캔버스 부모)"

implementation:
  bundler: "vite ^6.x"
  entry: src/main.js
  index_html: "Vite로 번들되는 정적 엔트리: 마크업·인라인 스타일·모듈 스크립트 한 줄만. 게임 로직·CSV는 모듈 엔트리에서만. HTML/CSS 전문은 이 MD에 적지 않는다."
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
    src/style.css:            "보조 스타일(번들). 엔트리 페이지 인라인 규칙과 겹치면 우선순위·중복을 수동 점검"
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
      - "4. 2D UI는 YAML dom_shell + 「2D UI 셸」절의 원칙·화면/id 계약을 지킨다. MD에 HTML/CSS를 추가해 명세를 덮어쓰지 말 것."
    completion_checklist:
      - "터미널에서 npm run build 가 오류 없이 완료되는가 (번들 단계에서 import/export 불일치는 게임 미표시와 동일 증상)"
      - "매칭 화면 → 아이콘이 하나씩 쌓이며 1/100 → 100/100 채워지는가"
      - "메인 화면 → Three.js 바닥·경로·돌다리·마커가 렌더링되는가"
      - "레벨 도전 → '게임 시도' 화면에 성공/실패 버튼이 표시되는가"
      - "성공 → 내 아이콘이 전진하고 봇 일부가 용암에 빠지는 연출이 실행되는가"
      - "실패 → 내 아이콘이 용암에 빠지고 보상 화면으로 이동하는가"
      - "7레벨 완주 → 전체 클리어 연출 후 그랜드 프라이즈 공유 화면이 표시되는가"
      - "arenaMap.js 가 import 하는 players.js 심볼(zForClears, zigXForTier, MARKER_Z_BIAS 등)이 export 와 일치하는지 빌드로 재확인"
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

**퍼즐 대체** — 실제 퍼즐 없음. "게임 시도" 화면에 성공/실패 버튼만. 나중에 실제 게임으로 교체.

**그랜드 프라이즈 공유** — 7레벨 완주자 전원이 프라이즈를 나눠 가짐. 생존자가 적을수록 1인당 보상 증가 → loss aversion 극대화.

## User Flow

### 1. 매칭
이벤트 배너 탭
  → LQ-UI-001 매칭 화면
  → 아이콘 1개씩 등장 (LQ-ANI-001), N/100 카운트
  → 100/100 도달 → "Tap to Continue"
  → LQ-UI-002 메인 로비

### 2. 메인 로비
용암 배경 + 돌다리 + 100개 아이콘
  → 상단: "Lava Quest" + Levels 0/7 + Players 100/100 + 타이머
  → "도전 시작" 버튼 탭
  → LQ-UI-003 게임 시도 화면

### 3. 게임 시도
"게임 시도" 텍스트 + 성공 버튼 + 실패 버튼
  → 성공 탭 → LQ-UI-004 클리어 연출
  → 실패 탭 → LQ-UI-005 실패 화면

### 4. 클리어 연출 (LQ-UI-004)
내 아이콘 전진 (LQ-ANI-002)
  → 봇들 순차 탈락 (LQ-ANI-003) — CSV 스케줄
  → Players 카운트 감소 연출
  → "Congratulations! You advanced to the next step!"
  → Levels N/7 갱신
  → "Tap to Continue"
  → 분기:
      ├── 레벨 < 7 → LQ-UI-002 복귀 (다음 레벨)
      └── 레벨 = 7 → LQ-UI-006 전체 클리어

### 5. 실패 (LQ-UI-005)
내 아이콘 용암 낙하 (LQ-ANI-004)
  → "도전 실패!" + 실패 레벨 + 클리어 수 표시
  → "보상 확인" 탭 → LQ-UI-008 보상 화면

### 6. 전체 클리어 (LQ-UI-006)
황금 플래시 (LQ-ANI-005)
  → "🔥 전체 클리어!!" + 7/7 배지
  → 생존자 수 + 그랜드 프라이즈 공유 금액
  → "보상 수령" 탭 → LQ-UI-008

### 7. 보상 (LQ-UI-008)
순위 + 클리어 수 + 보상 아이템
  → 클리어 보너스 배율 표시
  → "확인" 탭 → 종료

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
- delay_ms: 이전 탈락 후 대기 시간 (연속 탈락 연출)
- 봇 탈락 순서는 극적 효과를 위해 미리 설계 (초반 대량 탈락, 후반 소수 탈락)

### 레벨별 생존자 설계 (샘플)
| 레벨 클리어 후 | 탈락 수 | 생존자 |
|---|---|---|
| 레벨 1 | 28명 | 72명 |
| 레벨 2 | 20명 | 52명 |
| 레벨 3 | 15명 | 37명 |
| 레벨 4 | 12명 | 25명 |
| 레벨 5 | 8명 | 17명 |
| 레벨 6 | 5명 | 12명 |
| 레벨 7 (완주) | 3명 | 9명 |

### Three.js 돌다리 구조

**구현 상태 주의**: 아래 초안은 Perspective/FOV 서술이 포함되어 있으나, **현재 빌드는 Orthographic 탑뷰 + `players.js`의 `LAVA_FRUSTUM_HALF_H`(28.5) + `TOP_VIEW_LOOK_AT`** 조합이다. 수치 튜닝은 `players.js` / `lavaScene.js` / `arenaMap.js` 삼각을 우선 참고하고, 필요 시 본 스펙 문단도 함께 갱신한다.

```
카메라 시점: 위에서 약간 앞쪽 (PerspectiveCamera, FOV≈45)  ← 레거시 기획 문구
돌다리: Z축 방향 (화면 하단→상단)
  - 돌 7개 (레벨별 1개)
  - 간격: 4 units
  - 각 돌: CylinderGeometry(1.5, 1.5, 0.3) + MeshPhongMaterial
보물섬: 맨 끝 (Z = -28), 금색 플랫폼
용암: 전체 바닥, ShaderMaterial 출렁임

아이콘 배치:
  - 100개 원형 스프라이트
  - 시작 위치: Z = +14 (화면 하단)
  - 레벨 N 완료 시: Z = (14 - N×4)로 이동
  - 탈락 시: Y축 -5 낙하 + 용암 splash
```

### 봇 초기 배치 (lq_bot_config.csv)
```
bot_id, display_name, avatar_emoji, x_offset
bot_001, 용사김씨, 👤, -3.2
bot_002, 화염전사, 🔥, 1.8
...bot_099
```
- x_offset: 돌다리 좌우로 분산 배치 (-4 ~ +4)
- 실제 SNS 데이터로 교체 시 이 파일만 교체

### 애니메이션 명세
| ID | 트리거 | 스펙 |
|---|---|---|
| LQ-ANI-001 | 매칭 중 | 아이콘 1개씩 scale 0→1, 50ms 간격, 100개 순차 등장 |
| LQ-ANI-002 | 레벨 클리어 | 내 아이콘 translateZ -4units, 600ms ease-out |
| LQ-ANI-003 | 봇 탈락 | Y축 -8 낙하 2s + 용암 splash 파티클 (BoxGeometry 8개) |
| LQ-ANI-004 | 내 아이콘 탈락 | 카메라 흔들림 0.3s + 내 아이콘 낙하 + 화면 붉은 flash |
| LQ-ANI-005 | 7레벨 완주 | 황금 플래시 0.3s → "전체 클리어" scale bounce 0.6s → 파티클 |

## 2D UI 셸 (Panel Comic)

**원칙:** 이 문서에는 **HTML·CSS 전문을 넣지 않는다.** 마크업이 MD에 있으면 다음 담당 AI가 「명세 복붙」로 **잘못된 단일 진실원**을 만들기 쉽다. 레이아웃·스타일·카피는 **현재 작업 중인 프로젝트에 남아 있는 산출물**만을 편집 대상으로 한다.

**시각 언어 (YAML `dom_shell`과 동일 계열):**

- 바깥: 연회색 웹뷰포트 느낌의 배경, 가운데 **고정 프레임(약 390×844)** 종이 카드.
- 카드: **굵은 검은 테두리**, **하드 드롭 섀도**, 배경은 크림/종이색(`--paper`), 강조는 빨강/앰버 계열 라벨.
- 글꼴: **Outfit** (대비되는 굵기 400/700/900).
- 패널: `stat-box`, `notice-box`, `lq-header`, `lq-title-sm`, 하단 **`footer-area`** + 넓은 CTA 버튼 등 **아레나류 미니게임**과 같은 패널 리듬.
- 매칭: 점선/박스 안 **N / 100**, 스크롤 영역에 **작은 원형 칩** 다수(대략 28px 전후, 테두리·등장 트랜지션). **나** 칩은 파랑 강조.
- 시도 화면: 반투명·블러 배경 가능, 헤더 다크 바, **성공/실패** 두 축 CTA(녹/적).
- 클리어/실패/보상/풀클리어/순위: 동일 토큰으로 stat + notice + footer·스크롤 리스트 패턴 유지.
- 연출: 풀프레임 WebGL 임시 마운트를 위한 **루트 안 최상위 fx 레이어**(id는 YAML `fx_layer` 참고)를 둘 수 있음.

### 화면 id (`id` 속성 값 — 반드시 유지)

| 화면 | id |
|------|-----|
| 매칭 | `screen-matching` |
| 로비 | `screen-lobby` |
| 시도 | `screen-attempt` |
| 클리어 연출 | `screen-clear` |
| 실패 | `screen-fail` |
| 보상 | `screen-reward` |
| 전체 클리어 | `screen-full-clear` |
| 순위 | `screen-ranking` |

### 부트스트랩·게임 로직과 연결되는 DOM id (빠지면 동작 깨짐)

`match-current`, `btn-matching-continue`, `btn-lobby-info`, `stat-levels`, `stat-players`, `lobby-timer`, `canvas-container`, `btn-start-attempt`, `btn-ranking`, `attempt-level-num`, `attempt-players-alive`, `btn-success`, `btn-fail`, `clear-levels`, `clear-players`, `clear-timer`, `canvas-container-clear`, `btn-clear-continue`, `fail-level`, `fail-clear-count`, `btn-fail-reward`, `final-rank`, `final-clear-count`, `reward-grid`, `bonus-multiplier`, `btn-reward-confirm`, `survivors-count`, `winner-avatars`, `btn-full-clear-reward`, `rank-list`, `btn-ranking-close`, `toast`, `lq-fx-mount`

(프로젝트마다 추가·삭제된 id가 있으면 **엔트리 스크립트의 조회 목록과 반드시 맞출 것.**)

### 에이전트 지시 (UI)

- MD에서 HTML을 생성·붙여 넣어 명세를 갱신하지 말 것.
- UI를 바꿀 때는 **위 시각 원칙**과 **화면/id 계약**을 깨지 않을 것.
- 영문 기본 카피로 **되돌리기 위해** MD만근거로 삼지 말 것(제품 언어는 프로젝트 상태 유지).

## Content Guidelines

### lq_bot_config.csv
```
bot_id, display_name, avatar_emoji, x_offset
bot_001, 용사김씨, 👤, -3.2
bot_002, 화염전사, 🔥, 1.8
...
bot_099, 철벽수비, 🛡️, 0.5
```

### lq_elimination_schedule.csv
```
level, bot_id, delay_ms
1, bot_003, 500
1, bot_007, 800
1, bot_015, 1200
1, bot_022, 1800
...
```
- 총 91개 항목 (100명 → 9명 생존 기준)
- delay_ms 합산이 클리어 연출 총 길이
- 실제 서버 데이터로 교체 시 이 파일만 교체

### lq_level_config.csv
```
level, difficulty_label, target_clear_rate, tip_text
1, 쉬움, 0.72, 첫 레벨! 가볍게 시작하세요
2, 보통, 0.52, 집중력이 필요합니다
...
7, 매우 어려움, 0.09, 최후의 도전!
```

### lq_event_config.csv
```
event_id, event_name, group_size, total_levels, duration_hours, grand_prize, share_count_demo
lq_001, 용암 퀘스트 1회차, 100, 7, 24, 10000, 9
```

### localStorage 계약
```javascript
lq_session_v1: { phase, level_current, players_alive, bot_states[] }
lq_player_v1:  { status, avatar_index, cleared_levels[] }
```

## 작업 회고 · 노하우 · 다른 채팅에서 동일 결과를 내기 위한 핸드오프

이 절은 **동일 명세로 Vite + Three.js 클라이언트를 재구현**할 때의 실패를 줄이기 위한 기록이다. 상단 YAML의 `implementation.files`, `ai_directives`, `Anti-Patterns`와 함께 읽을 것.

### 1. 아키텍처 요약 (실제 코드 기준)

- **엔트리**: `main.js`가 CSV·localStorage를 읽고 `game.js`의 세션 루프를 시작한다. `bootstrap().catch`에서 예외 시 토스트를 띄우는 패턴이 있으므로, **초기화 중 throw = 사용자에게는 빈 화면/토스트**로 이어질 수 있다.
- **3D 조립의 단일 진입점**: `lavaScene.js`의 `mountLavaScene`이 `setup.js`(Orthographic 탑뷰), `lava.js`, `bridge.js`, `arenaMap.js`, `players.js`를 한 흐름으로 묶는다. 화면별로 캔버스 컨테이너가 나뉘면 **마운트 직전 `getBoundingClientRect()`로 크기 확정** 후 리사이즈(기존 Anti-Patterns의 DANA 규칙과 동일).
- **좌표·난이도의 단일 출처**: 돌다리 단계 Z, 마커 Z 보정, 티어별 X 지그재그는 **`players.js`에서 상수·함수로 정의하고 `arenaMap.js`가 import**한다. 지형 메시와 플레이어 마커가 어긋나지 않게 하려면 **반드시 이 단방향 의존**을 유지한다(역방향 중복 숫자 하드코딩 금지).

### 2. 실제로 막혔던 문제: 「게임이 안 뜸」과 빌드 실패

- **증상**: 브라우저에서 아무 반응이 없거나, dev 서버는 떠 있으나 앱 번들이 올라오지 않는다.
- **직접 원인(대표 사례)**: `arenaMap.js`가 `players.js`에서 `MARKER_Z_BIAS`, `zigXForTier` 등을 named import 하는데, **디스크상 `players.js`에 해당 심볼이 export 되지 않은 상태**. Rollup/Vite는 `"X" is not exported by "players.js"`로 **빌드 자체를 중단**한다.
- **왜 디버깅이 꼬였는가**: 에디터(Cursor) 버퍼에만 수정이 있고 **저장되지 않은 채 빌드가 디스크 파일을 읽는 경우**, 화면과 터미널 결과가 달라진다.
- **재발 방지 루틴**:
  1. 구조 변경 직후 **반드시 `npm run build` 한 번**(CI 없을 때 특히).
  2. `arenaMap.js` 상단 import 목록과 `players.js`의 `export` 목록을 **한 쌍으로 grep**하여 싱크 확인.
  3. 공유 상수 추가 시 **한 파일에만 정의 후 import** — `MARKER_Z_BIAS`, `ZIG_X_AMPLITUDE`, `zigXForTier`, `zForClears`, `PLAYER_START_Z`, `STEP_Z_DELTA`, `LAVA_FRUSTUM_HALF_H` 등.

### 3. Three.js / 연출 노하우

- **Perspective vs Orthographic**: `setup.js`에 둘 다 있다. 실제 라바 퀘스트 로비 연출은 **`createLavaTopViewBasics` + 오쏘 `worldUnitsPerPixel`** 조합으로 UI 픽셀과 월드를 맞춘다. 문서 초안에 Perspective만 적혀 있으면 구현체와 불일치하므로 **이 문서의 identity.renderer 줄을 기준**으로 할 것.
- **돌다리·상자 시각**: `bridge.js`에서 반복 메시(예: 상자 3개)는 **의도된 루프**일 수 있으니, 버그로 지우기 전 기획 확인.
- **dispose**: 화면 전환 시 WebGL 리소스 누수를 막기 위해 `dispose.js` 패턴과 `setup`의 `dispose()` 콜백을 호출한다(기존 Anti-Patterns 유지).

### 4. 데이터·CSV·public 경로

- 정적 파일은 `public/`의 `lq_*.csv`를 가정한다. **fetch 404**는 런타임에서 조용히 실패할 수 있으므로, 네트워크 탭과 `main.js` 로드 경로를 초기에 확인한다.
- 탈락 순서는 **CSV가 단일 진실 공급원**(Anti-Patterns의 랜덤 금지와 동일).

### 5. 다른 채팅(에이전트)에게 주고 싶은 지시 문장 예시

다음은 이 MD만 던져서 재구현시킬 때 붙여 넣기 좋은 **한 줄 요약**이다.

> `GAME_lava_quest.md`의 YAML·「2D UI 셸」「작업 회고」「Anti-Patterns」「Advanced Implementation Specs」를 순서대로 따른다. `npm run build`가 통과해야 하며 `arenaMap.js`와 `players.js`의 export/import 계약은 수정 후 즉시 빌드로 검증한다. UI는 MD에 HTML을 새로 쓰지 말고 YAML dom_shell·「2D UI 셸」원칙과 id 계약을 지키며, Three 레이아웃은 `lavaScene.js` 단일 진입점을 유지한다.

### 6. 문서와 코드의 불일치가 나기 쉬운 곳 (주기적으로 스캔)

| 문서 구간 | 실제 코드에서 확인할 것 |
|----------|-------------------------|
| Mechanics in Depth의 Perspective/FOV 서술 | 탑뷰 오쏘 + `LAVA_FRUSTUM_HALF_H` |
| 돌 간격 예시 숫자 | `STEP_Z_DELTA`, `PLAYER_START_Z` |
| 마커 지름(px) 서술 | `worldUnitsPerPixel` × 반지름 계수 |

위 표는 **기획 변경 시 문서·코드 동시 수정**을 강제하는 체크리스트로 사용한다.

## Anti-Patterns

[CRITICAL] arenaMap.js ↔ players.js export/import 불일치
- arenaMap에서 import하는 이름은 반드시 players에서 export해야 한다. 빌드가 한 번이라도 깨지면 배포물이 없거나 HMR이 멈춘다.
- 공유 좌표 상수를 arenaMap에만 두거나 복사해 두지 말 것(드리프트의 원인).

[CRITICAL] 봇 탈락을 랜덤으로 결정 금지
- 반드시 lq_elimination_schedule.csv 기반으로 결정
- 실제 서버 교체 시 CSV만 바꾸면 되는 구조 유지

[CRITICAL] 레벨 완료 전 탈락 연출 시작 금지
- 내 아이콘 전진(LQ-ANI-002) 완료 후 봇 탈락(LQ-ANI-003) 시작
- 순서 뒤바뀌면 연출이 어색해짐

[CRITICAL] #canvas-container 크기 기준
- 반드시 getBoundingClientRect() 사용
- window.innerWidth/Height 사용 금지 (DANA 규칙)

[CRITICAL] 탈락 후 재도전 허용 금지
- status == ELIMINATED 이후 attempt 화면 진입 차단
- 보상 화면으로만 이동

[CRITICAL] Players 카운트 즉시 변경 금지
- 봇 탈락 연출 완료 후 카운트 갱신
- 연출 중 숫자 변경은 어색함

[CRITICAL] 게임 로직 단일 파일 금지
- 애플리케이션 로직·CSV·Three 조립은 모듈로만. 정적 엔트리에는 마크업·스타일·엔트리 스크립트 태그만.

[CRITICAL] Three.js dispose 누락 금지
- 화면 전환 시 disposeScene() 호출 필수
- 씬 traverse → geometry/material dispose → canvas 제거

LQ-ANI-003 봇 탈락 연출 생략 금지 — 이 게임의 핵심 시각 연출
btn-success/btn-fail 디버그 버튼은 최종 버전에서도 유지 — 실제 게임 교체 전까지 필수

## Advanced Implementation Specs (AI Directives)

1. **Three.js 용암 ShaderMaterial**:
   - `lava.js`: PlaneGeometry 전체 바닥, ShaderMaterial
   - uniform `time` 매 프레임 갱신으로 출렁임 효과
   - 복잡한 셰이더 불필요 — sin/cos 기반 단순 파동으로 충분
   ```glsl
   // fragment shader 핵심
   vec2 uv = vUv + vec2(sin(time * 0.5 + vUv.y * 3.0) * 0.02, 0.0);
   vec3 lava = mix(vec3(0.91, 0.31, 0.19), vec3(1.0, 0.42, 0.21), uv.x);
   ```

2. **플레이어 마커(원형 디스크) 최적화**:
   - 현재 구현: `players.js`에서 `CircleGeometry` + 개별 `Mesh`로 생성(코드 간결·추후 트윈 용이). 100개면 대부분 기기에서 감당 가능.
   - 확장 시: 동일 속성 재질이라면 **InstancedMesh + `setMatrixAt`**로 draw call 줄이기(문서 초안은 이 방향을 권장했으나 필수 구현 아님).

3. **봇 탈락 순차 연출 패턴**:
   ```javascript
   // simulation.js
   async function runEliminationSchedule(level) {
     const schedule = eliminationData.filter(e => e.level === level);
     for (const event of schedule) {
       await delay(event.delay_ms);
       eliminateBot(event.bot_id);  // Three.js 낙하 + Players 카운트 갱신
     }
   }
   ```

4. **화면 전환 + Three.js 마운트 타이밍**:
   - lobby/clear 화면 전환 후 `requestAnimationFrame` 1프레임 대기
   - 그 후 `mountLavaScene()` 호출 (container 크기 확정 후)
   - `showScreen` 패턴: 배열 + for loop (Archery Arena와 동일)

5. **매칭 화면 아이콘 스택 연출**:
   - DOM 기반 (Three.js 불필요)
   - 50ms 간격 setTimeout 재귀로 아이콘 1개씩 추가
   - 아이콘: `div.avatar-item` scale 0→1 CSS transition

6. **completion_checklist 통과 기준**:
   - "용암 배경" = Three.js canvas에 출렁이는 용암이 실제로 보이는 것 육안 확인
   - "봇 탈락" = 아이콘이 Y축으로 떨어지는 것 육안 확인
   - 콘솔 에러 없음만으로 통과 선언 금지
