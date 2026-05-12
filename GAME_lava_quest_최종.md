---
identity:
  name: "Lava Quest"
  id: lava_quest
  genre: [배틀로얄, 생존경쟁, 이벤트]
  platform: [web]
  players: 1
  pitch: "100명이 동시에 시작해 7레벨을 연속 클리어하는 생존 경쟁으로, 레벨마다 탈락자가 연출되고 최종 생존자가 그랜드 프라이즈를 나눈다."
  theme: "삼국 용암 던전 — 용암·돌다리·탑뷰 마커(Three.js) + 패널 스케치풍 2D HUD"
  renderer: "Three.js r172 WebGL — Orthographic 탑뷰(createLavaTopViewBasics). 로비=#canvas-container, 클리어=#canvas-container-clear. 마커는 CircleGeometry + MeshBasicMaterial, 반지름 = worldUnitsPerPixel×3.85(lavaScene.js `markerWorldR`). 돌계단 메시는 실린더+토러스 조합, 계단 재질은 검정(0x000000) 계열; 보물 섬은 박스+상자 조합(별도 금 구체 더미 없음)."
  color:
    lava: "#E85030"
    lava_bright: "#FF6B35"
    stone: "#6B5A4E"
    gold: "#D4A017"
    gold_bright: "#FFD700"
    surface: "#1A0A02"
    ink: "#111111"
    safe: "#16A34A"
    danger: "#DC2626"
    my_player: "#1A6FD4"
    eliminated: "#999999"

components:
  player_state:
    level_current: { type: int, range: [0, 7], default: 0 }
    status: { type: enum, values: [WAITING, ACTIVE, ELIMINATED, COMPLETED] }
    is_me: { type: bool, default: false }
    avatar_index: { type: int }
    position_z: { type: float }

  session_state:
    phase: { type: enum, values: [MATCHING, LOBBY, ATTEMPT, CLEAR, FAIL, FULL_CLEAR, RANKING, REWARD] }
    clears_completed: { type: int, range: [0, 7], default: 0 }
    players_alive: { type: int, range: [0, 100], default: 100 }
    timer_remain_ms: { type: int }
    event_id: { type: string }

  elimination_event:
    level: { type: int }
    bot_id: { type: string }
    delay_ms: { type: int }

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
    continue_matching:
      actor: player
      preconditions:
        - "MATCHING 화면에서 100/100 연출이 끝난 뒤"
      effects:
        - "LOBBY 화면으로 전환, Three 로비 씬 마운트"

    start_attempt:
      actor: player
      preconditions:
        - "LOBBY이며 busy가 아님"
        - "플레이어 인덱스 0이 alive에 포함"
      effects:
        - "ATTEMPT 화면, lq_level_config의 tip_text 표시(있을 때)"

    resolve_success:
      actor: player
      preconditions:
        - "ATTEMPT이며 busy가 아님"
        - "alive에 0 포함"
      effects:
        - "CLEAR 화면, 생존자 전원 clearsForRank++(bumpClearsAlive) 후 clearsCompleted 증가, fleaIntro 씬,rebuildClear(playerClears=c-1)"
        - "playClearSuccessAnimation: 플레이어 선행 트윈 후 CSV 간격×PACE 스케줄 순 탈락, 생존자 파동 재배치"
        - "game.alive에서 elimPlan idx 제거"

    resolve_failure:
      actor: player
      preconditions:
        - "ATTEMPT이며 busy가 아님"
      effects:
        - "풀스크린 임시 WebGL에서 낙하 연출, FAIL 화면, alive에서 0 제거"

    continue_after_clear:
      actor: player
      preconditions:
        - "CLEAR에서 연출 완료 후 버튼 활성"
      effects:
        - "clearsCompleted==7이면 FULL_CLEAR, 아니면 LOBBY"

    open_ranking:
      actor: player
      effects:
        - "RANKING 화면, rank-list 렌더"

    close_ranking:
      actor: player
      effects:
        - "LOBBY 복귀"

    claim_reward_full_clear:
      actor: player
      effects:
        - "REWARD 화면"

    claim_reward_fail:
      actor: player
      effects:
        - "REWARD 화면"

    confirm_reward:
      actor: player
      effects:
        - "resetToFreshEvent(): alive·clearsCompleted·clearsForRank·meFailedAttemptLevel 메모리 초기화, disposeLobby/disposeClear, clearPersistentSession 후 깨끗한 상태로 persistSnapshot(SESSION_VERSION)"
        - "screen-matching 표시, startMatchingAnimated()로 100명 매칭 연출 재생, 안내 토스트"

    session_reset_from_overlay:
      actor: player
      preconditions:
        - "#btn-session-reset 탭"
      effects:
        - "window.confirm 수락 시 confirm_reward와 동일한 resetToFreshEvent + MATCHING + startMatchingAnimated + 토스트(문구만 다름)"

    show_lobby_info:
      actor: player
      effects:
        - "이벤트 이름 토스트"

  loops:
    - name: lobby_attempt_loop
      description: "LOBBY ↔ ATTEMPT ↔(성공) CLEAR ↔ LOBBY 또는 FULL_CLEAR"
    - name: elimination_per_level
      description: "CSV elimPlanForLevel(level)의 delay_ms 간격으로 봇 연출 후 game.alive 동기화"

goals:
  win:
    - condition: "clearsCompleted가 7이 되어 전체 클리어 분기로 진입한다."
  loss:
    - condition: "resolve_failure로 플레이어가 탈락한다."

# --- 확장 메타(규범 외, 저장 허용) ---
implementation_truth:
  document_role: "본 파일은 레포의 구조적 단일 개요이다. (1) 기획·스펙: YAML mechanics/goals. (2) 구현 계약: dom id, 세이브 스키마, UI 셸 규약, Three·CSV·부트 순서. (3) 운영 지식: agent_audit_log·Anti-patterns — 재구현·멀티 에이전트(AntiGravity·Claude·단서) 작업 시 여기와 실제 소스가 어긋나면 **먼저 MD를 고치거나 소스를 MD에 맞출지 결정**하고 진행한다. HTML/CSS 전문은 저장소에 두고 이 문서에는 id·패턴 요약만 둔다."
  bundler: "Vite ^6, npm run build / dev / preview"
  entry: "index.html + src/main.js (dev는 body 끝 모듈; prod 빌드 시 script/link가 head로 인라인될 수 있음)"
  style_source_of_truth: "src/style.css 번들 + index.html 마크업. index.html에 인라인 <style> 없음(MD에 HTML 전문을 두지 말 것)."
  collaboration:
    ui_lead: "AntiGravity — UI 마크업(index.html), 스타일(src/style.css), 정적 카피·시각 레이아웃·컴포넌트화 등 2D 셸의 주 구현 담당."
    logic_lead: "단서/Claude Code 등 — game.js 화면 전환·세이브·Three 연출·이벤트 로직; UI id/ElRefs 변경 시 main.js·game.js와 동기 필요."
  dom_required_ids:
    screens: ["screen-matching","screen-lobby","screen-attempt","screen-clear","screen-fail","screen-full-clear","screen-ranking","screen-reward"]
    hud: ["prize-amount","match-current","btn-matching-continue","stat-levels","stat-players","lobby-timer","clear-timer","canvas-container","canvas-container-clear","btn-start-attempt","btn-ranking","attempt-level-num","attempt-players-alive","attempt-tip","btn-success","btn-fail","attempt-flash-overlay","clear-levels","clear-players","clear-message","player-group","btn-clear-continue","fail-level","fail-clear-count","btn-fail-reward","full-clear-overlay","full-clear-title-el","survivors-count","share-count","winner-avatars","btn-full-clear-reward","rank-list","btn-ranking-close","final-rank","final-clear-count","reward-grid","bonus-multiplier","btn-reward-confirm","btn-lobby-info","btn-session-reset","toast"]
    dom_supplementary_ids:
      "lobby-hint-message": "로비 상단 힌트(#lobby-hint-message, 클래스 .clear-message .clear-message--muted). 현재 정적 카피만 — main.js ElRefs·game.js에 없음. 상태 연동 문구가 필요하면 id를 ElRefs에 추가하고 refreshHud 등에서 갱신."
      "clear-bonus": "보상 화면 보너스 행 래퍼(#clear-bonus). 수치는 자식 #bonus-multiplier만 game.js에서 갱신; 래퍼는 레이아웃·스타일용."
  persistence:
    key: "lq_session_v1 (data.js LS_SESSION 상수명은 v1 유지, 필드 version은 2)"
    shape: "{ version:1|2 (코드 상수 SESSION_VERSION=2로 저장), clearsCompleted, aliveIds:number[], clearsForRank:number[], meFailedAttemptLevel:number|null }"
    migrate_load: "src/main.js·createGame: persisted.version이 1 또는 SESSION_VERSION이고 배열 길이가 bots과 일치할 때만 resumeOk"
    bootstrap: "유효 세션은 createGame에 주입되나, 첫 화면은 항상 매칭 연출 후 「계속」으로 로비(자동 로비 스킵 없음). 새로고침만으로는 localStorage가 남으면 진행이 복원되므로 완전 초기화는 보상 확인 또는 #btn-session-reset 경로 필요"
    save_repair_on_load: "saveOk인데 (1) clearsCompleted>=7 이고 생존자 수>=99 같은 비현실 조합이면 clearPersistentSession 후 전원 부활·clears 0으로 리셋 (2) 살아 있는 플레이어(0)의 clearsForRank[0]과 clearsCompleted가 다르면 clearsCompleted를 r0에 맞추고 생존자 전원 clearsForRank를 동일 티어로 맞춘 뒤 persistSnapshot"
  elimination_csv:
    parser: "simulation.elimPlanForLevel — level행 필터, bot_id→index, delay_ms 오름차순, 동일 봇은 최소 delay만"
    runtime_semantics: "연출 타임라인에서 CSV delay_ms 차이에 lavaScene.js의 PACE(0.52)를 곱해 waitMs를 만든다(전체 연출 가속). 트윈 기간도 paceMs()로 동일 계수 스케일"
  three_resize: "setup.createLavaTopViewBasics — container getBoundingClientRect 기반 setSize(ortho frustum 재계산)"
  fx_fail_fullscreen: "고정 #lq-fx-mount 없음. failAnimFullScreen이 body에 임시 div.lq-fx-mount 부착 후 연출 끝 remove"
  ui_shell:
    pattern: "각 .screen은 세로 flex 열. 본문은 .screen-body(필요 시 overflow-y:auto), 주요 CTA는 footer.screen-footer로 분리해 하단에 고정(패딩·safe-area 동일 리듬). 로비는 동일 역할을 .lobby-footer가 담당(패딩·border-top·z-index를 푸터 계열과 맞춤)."
    design_tokens: "src/style.css :root — --screen-pad-x(14px), --section-gap(12px), --footer-pad-y(12px), --tap-target-min(48px), --font-content-sm|content|stat|title-pill. 신규 간격·복사 크기는 변수로만 추가하는 것을 권장."
    footer_z_index: "footer.screen-footer에 z-index:8 — .lq-gold-overlay·attempt-flash 등 absolute 오버레이보다 위에서 탭 가능."
    matching_dom: "MATCHING은 .screen-body.screen-body--matching 안에 .lq-title·.grand-prize-display(prize-chest·prize-label·#prize-amount)·.matching-box·#avatar-stack 순. #btn-matching-continue는 .screen-footer 안(클래스 btn-primary btn-footer). 버튼이 .hidden일 때 빈 푸터가 자리를 차지하지 않도록 :has(#btn-matching-continue.hidden)로 푸터 패딩·배경 제거."
    matching_grid_css: "#avatar-stack display:grid; grid-template-columns:repeat(10,minmax(0,1fr)); gap:0. 각 셀은 .avatar-cell(점선 테두리·padding 4px·flex 중앙). .avatar-item은 width 90% 등으로 원 지름 제어. 패널 가로는 width:100%+margin 금지 → width:auto; align-self:stretch로 위 카드들과 동일 14px 인셋."
    other_footers: "ATTEMPT·CLEAR·FAIL·FULL_CLEAR·REWARD는 동일 패턴(본문 .screen-body + footer). ATTEMPT attempt-buttons는 footer.screen-footer--attempt 내부."
    session_reset_button: "#app 직계 자식 #btn-session-reset — 텍스트 없이 SVG 갱신 아이콘, 40×40 정사각, 스타일은 .btn-info와 동일 리듬(border 3px, radius 12px, box-shadow 4px 4px 0). top:8px, right:var(--screen-pad-x). aria-label=진행 초기화"
    webgl_frame_flex: "로비·클리어: .lava-canvas-frame이 flex:1 1 auto; min-height:0, 내부 .lava-canvas도 flex:1·min-height:0으로 뷰포트 남는 높이에 WebGL이 들어가게 함(고정 픽셀 높이만 쓰지 않음)"
    lobby_clear_headers: ".lq-header — 로비는 #btn-lobby-info(40×40), 클리어는 동일 너비 .lq-header-leading(숨김) + 가운데 .lq-title-sm으로 제목 정렬 맞춤"
    ranking_screen: "screen-ranking은 하단 screen-footer 없음. 상단 .ranking-header(내부 .ranking-title + #btn-ranking-close) 아래 본문 #rank-list 단독 스크롤 영역 — LOBBY/CLEAR의 .lq-header·stats·timer 패턴과 다르므로 동일 시퀀스로 착각하지 말 것."

verification_checklist:
  - "npm run build 무오류"
  - "index.html에 #toast 존재(showToast·초기 오류 메시지)"
  - "매칭 → 계속 → 로비 Three 표시"
  - "매칭: 연출 중에는 하단 푸터가 빈 줄로 보이지 않음(:has 숨김 규칙); 계속 노출 후 푸터 높이·safe-area가 다른 화면 CTA와 대체로 동일 리듬"
  - "도전 시작 → ATTEMPT에서 성공/실패 버튼이 푸터에 고정되고 뷰포트 밖으로 잘리지 않음(본문만 스크롤)"
  - "성공 → 클리어 연출(플리 인트로·플레이어 전진·CSV 순 탈락·파동) 후 HUD alive 갱신"
  - "보상 확인·우상단 초기화: confirm 후 메모리+localStorage 일관 리셋, 매칭 연출 재생"
  - "우상단 초기화 버튼이 .btn-info와 동일한 정사각 리듬이며 텍스트 없이 SVG만 표시"
  - "arenaMap.js ↔ players.js named export 계약 유지"

agent_audit_log:
  summary: "다음 항목은 Cursor 에이전트(단서) 리팩터·버그픽스 라운드에서 실제로 발생한 실패/수정이다. 스펙만 보고 재구현할 때 동일 함정을 재현하지 말 것."
  failures_observed:
    - issue: "전역 고정 #lq-fx-mount가 z-index로 WebGL 전체를 덮어 마커 이동 연출이 안 보임"
      fix: "index.html에서 제거, 실패 연출 시에만 body에 임시 마운트"
    - issue: "localStorage 세션만 있으면 resumeFromLobby로 매칭 스킵 → 체감상 메인(매칭) 미표시"
      fix: "상태는 복원하되 항상 startMatchingAnimated()부터"
    - issue: "showScreen 전 data.levelConfig.find 예외 시 이후 줄 미실행"
      fix: "Array.isArray 가드"
    - issue: "토스트·캔버스가 상단 레이어에서 버튼 클릭 가로챔"
      fix: ".toast pointer-events:none, .lava-canvas canvas pointer-events:none, showScreen 시 토스트 숨김"
    - issue: "#screen-attempt에 min-height:0 부재 + 버튼 margin:auto → 모바일에서 버튼 잘림·진행 불가"
      fix: ".screen { min-height:0 }, #screen-attempt overflow-y:auto, attempt-buttons 마진 조정·safe-area"
    - issue: "index.html에 #toast 누락 시 오류/가드 메시지 무반응"
      fix: "toast 노드 필수(본 문서 verification 참고)"
    - issue: "매칭 그리드 패널에 width:100%와 좌우 margin 동시 지정 → 부모보다 넓어져 오른쪽 오버플로"
      fix: "avatar-stack width:auto + align-self:stretch; 좌우 여백은 .screen-body--matching padding(--screen-pad-x)로 통일"
    - issue: "매칭 #avatar-stack flex:1로 세로 여유를 전부 점유 → 그리드 아래 빈 박스만 커짐"
      fix: "flex:0 1 auto로 내용 높이만큼만; 본문·푸터 분리 후 계속 버튼은 footer 고정"
    - issue: "각 화면 하단 버튼 위치가 콘텐츠 높이에 따라 들쭉날쭉"
      fix: "screen-body + screen-footer 패턴, 토큰 --footer-pad-y·--screen-pad-x로 패딩 통일"
    - issue: "점선 칸 안 원형 아이콘에 box-shadow x-offset → 시각적으로 오른쪽으로 치우쳐 보임"
      fix: "그림자는 0 Npx 0(수직만) 등 좌우 대칭"
    - issue: "매칭에서 계속 버튼 숨김 시에도 빈 footer가 세로 공간 차지"
      fix: "#screen-matching .screen-footer:has(#btn-matching-continue.hidden)로 패딩·배경 제거"
    - issue: "localStorage에 깨진 세이브(예: 7클리어·거의 전원 생존)로 비현실 스냅샷"
      fix: "createGame 내 save_repair_on_load — 과도한 완주 패턴이면 스토리지 비우고 신규 이벤트 상태로; 플레이어 랭크 클리어와 clearsCompleted 불일치 시 동기화 후 persist"
    - issue: "보상 「확인」이 스토리지만 지우고 데모 루프가 이전 alive/clears와 불일치"
      fix: "resetToFreshEvent + persistSnapshot 후 MATCHING·startMatchingAnimated (클로저 밖에서 호출 가능하도록 createGame이 객체로 반환)"
    - issue: "브라우저 새로고침만으로 진행이 안 지워짐"
      fix: "의도된 동작 — 완전 초기화는 btn-reward-confirm 또는 btn-session-reset + confirm"
    - issue: "클리어 씬 첫 프레임에서 마커 위치가 HUD 레벨과 어긋남"
      fix: "mountLavaScene(..., { playerClears }) — 로비는 clearsCompleted, 클리어 rebuildClear는 bridgeTierBeforeWin=c max(0,clearsCompleted-1) 후 fleaIntro·updatePlayerClears로 맞춤"
    - issue: "생존자 마커마다 돌 티어가 제각각으로 보임"
      fix: "players.js computeClusterTargets — 동시 게임 가정으로 생존자 전원 tier=playerClears(클램프 0..7)"
  non_goals:
    - "본 레포는 매칭·서버 동기화 없음 — CSV/로컬 연출 데모"
---

## Design Pillars

**100인 동시 시작의 긴장감** — 매칭 화면에서 점(dot) 아이콘이 순차 등장하고 N/100이 채워지며 이벤트가 열리는 인상을 준다.

**돌다리·경로 시각화** — Orthographic 탑뷰에서 용암·돌다리·데코와 원형 마커로 진행도를 읽는다.

**탈락 연출의 리듬** — 플레이어 전진 후 CSV `delay_ms`에 맞춘 순차 탈락(실제 대기시간은 `PACE`로 스케일), 이후 생존자 파동 재배치로 “한 번 더 무너지는” 리듬을 만든다.

**스케치 HUD·무이모지 UI** — 순위 줄은 `.rk-dot` 원 마커, 풀클리어 생존자 칩은 빈 `.winner-avatar` 도형, HTML/static 카피/HTML 보상 타일은 이모지 대신 도형·텍스트(데이터 CSV의 `avatar_emoji`는 랭킹 정렬용 필드로만 남을 수 있음).

**퍼즐 대체** — ATTEMPT 화면은 성공/실패 버튼만 두고 실제 미니게임은 후속 본페이지 교체 전제.

**프라이즈 공유 프레이밍** — 전체 클리어 시 생존자 수·나눔 카피로 그랜드 프라이즈 동기를 유지한다.


## 작업 구조 (레이어·책임)

**이 레포를 열었을 때의 최상위 계약**은 YAML `implementation_truth.document_role`과 본 절·`dom_required_ids`다. 멀티 에이전트가 동시에 손댈 때 구조가 헷갈리면 먼저 그 블록부터 맞출 것.

후속 에이전트(AntiGravity·Claude Code·단서)가 같은 레포에서 손댈 때 **어느 층을 고치는지** 기준으로 정리한다.

1. **부트 / I/O** — `src/main.js`: CSV fetch, `loadPersistentSession`, `resumeOk` 게이트, `createGame` 호출, `attachHandlers`, **항상** `startMatchingAnimated()`.
2. **게임 상태 단일 저장소** — `src/game.js` `createGame`: `alive:Set`, `clearsCompleted`, `clearsForRank[]`, `meFailedAttemptLevel`, `busy`, 씬 핸들 `lobbyScene`/`clearScene`. 화면 전환·버튼 핸들러·`persistSnapshot`·`resetToFreshEvent`·세이브 보정 블록이 한 파일에 모여 있음.
3. **영속성 계약** — `src/data.js`: `LS_SESSION` 키, `SESSION_VERSION`, `save/load/clearPersistentSession`. 스키마 변경 시 **이 상수 + main의 resume 조건 + persistSnapshot 필드**를 세트로 수정.
4. **연출·시간축** — `src/lavaScene.js`: `PACE`, `paceMs`, `mountLavaScene`, `fleaIntro`, `playClearSuccessAnimation`, `animateSelfEliminate`. CSV `delay_ms`는 여기서 속도 배율 적용.
5. **시뮬레이션 수학** — `src/simulation.js`: `elimPlanForLevel`, 봇 인덱스 매핑. 게임 룰 데이터만 바꿀 때 주로 여기·CSV.
6. **Three 조각** — `src/three/setup.js`(리사이즈·ortho), `bridge.js`(계단·섬 메시), `players.js`(클러스터·트윈·`playerClears` 티어), `lava.js`/`arenaMap.js`/`dispose.js` — **export 이름 불일치 시 즉시 빌드 실패**.
7. **2D 셸** — `index.html` ID·섹션 트리, `src/style.css` 토큰·flex 규약, `src/ui.js` `showScreen`·토스트·포맷. **UI 주 담당: AntiGravity** (본 절·`implementation_truth.collaboration` 참고).
8. **검증 루프** — 구조 변경 후 `npm run build`로 번들 검증; 호출부·구현·상수가 한 세트인지 의심할 것.

백업: `backups/snapshot-*` 폴더에 이전 스냅샷이 있으면 롤백 참고용으로 둠(작업 규칙).

### 사용자 흐름 (코드 기준)

1. **bootstrap** — `public/lq_*.csv` 병렬 로드 실패 시 catch에서 `#toast` 메시지. 성공 시 `createGame(data, elRefs, { persisted })` → `attachHandlers()` → `startMatchingAnimated()` (매칭은 항상 첫 연출).
2. **MATCHING** — 마크업: `.screen-body--matching` 안에 카드들 + `#avatar-stack`. `avatar-stack`에 **약 32ms** 간격(i*32)으로 `div.avatar-cell` > `div.avatar-item` 지연 생성(`game.js` `startMatchingAnimated`), `match-current` 갱신, 100 도달 후 약간 지연해 `btn-matching-continue`에서 `.hidden` 제거. 클릭 시 `lobbyEnter()` → `showScreen('screen-lobby')`, `#canvas-container`에 `mountLavaScene(..., { playerClears: clearsCompleted })`, `persistSnapshot()`. 그리드는 CSS 10열 고정; flex-wrap+center 금지(마지막 행 한 줄 착시 방지).
3. **ATTEMPT** — `btn-start-attempt`에서 `levelConfig` 행으로 `#attempt-tip` 설정 후 `showScreen('screen-attempt')`.
4. **성공** — `busy` 세트, 로비/클리어 씬 dispose, `bumpClearsAlive` 후 `clearsCompleted` 증가, `showScreen('screen-clear')`, `rebuildClear`(`frameWait(2)` 후 fleaIntro; `playerClears`는 `max(0, clearsCompleted-1)`로 “이번 판 직전” 티어), `elimPlanForLevel(eliminationSchedule, clearsCompleted)`로 `playClearSuccessAnimation` 호출, 루프로 `alive`에서 탈락 인덱스 삭제, `persistSnapshot`.
5. **실패** — 임시 풀스크린 씬에서 `animateSelfEliminate`, `showScreen('screen-fail')`, `persistSnapshot`.
6. **CLEAR 계속** — 7클리어 시 full-clear 연출 분기, 아니면 `lobbyEnter`.
7. **보상 확인 / 전역 초기화** — `resetToFreshEvent` 후 `screen-matching` + `startMatchingAnimated()` + 토스트. 동일 로직을 `#btn-session-reset`(우상단, `confirm`)에서도 호출.

### 탈락 스케줄과 구현 계약

- **단일 출처**: `public/lq_elimination_schedule.csv` (`level`, `bot_id`, `delay_ms`).
- **`elimPlanForLevel`**: 플레이어(`bot_001`→index 0) 항목은 연출에서 제외. 동일 `bot_id` 중복 행은 가장 이른 `delay_ms`만 유지. 정렬: `delay_ms` 오름차순.
- **연출 순서 (`lavaScene.playClearSuccessAnimation`)**: (1) `playerClears` 기준 이전/이후 목표로 플레이어 트윈 (2) `playerClears = clearsAfter` (3) elimPlan 순회: 대기 `waitMs = max(0, floor((d - prevScheduled) * PACE))` 후 scatter 트윈 (4) 생존자 서바이버 웨이브로 `tweenWorldPos` (5) `syncVisual`.

### Three.js / 레이아웃

- **진입점**: `src/lavaScene.js` → `createLavaTopViewBasics` (`src/three/setup.js`), `worldRoot` Y는 `bridgeLiftWorldForPixels`로 조정.
- **마커**: 원 반지름 `markerWorldR = wpp * 3.85`. `src/three/players.js` — 생존자 **전원 동일 티어** `tier = clamp(playerClears,0,7)`로 `computeClusterTargets`·`layoutAliveCluster`. `layoutLavaScatter`, `tweenFleaHops`, `PLAYER_START_Z`, `STEP_Z_DELTA`, `MARKER_Z_BIAS`, `zigXForTier` 등. **지형 데코**는 `arenaMap.js`가 동일 심볼을 import — export/import 불일치 시 빌드 실패.
- **돌다리 메시** (`bridge.js`): 7티어 실린더 스텝 + 토러스 링; 스텝 재질은 검정 계열. 끝 섬은 금색 박스 + 상자 박스들(별도 코인용 구체 메시 없음).
- **카메라 연동 실패 연출**: `tweenCameraShake`는 `CAMERA_LOOK_Y`( `syncCameraLookYWorld`)를 사용.

### 타이머·HUD

- `eventConfig.duration_hours`→ `timerRemainMs`, `syncClocks`로 **lobby-timer**와 **clear-timer** 동시 갱신.

### UI 셸 · 2D 레이아웃 (해석용 상세)

이 절은 **프로그래머가 아닌 기획/에이전트**도 `index.html`/`style.css`를 열지 않고 **왜 이렇게 생겼는지** 추적할 수 있게 쓴다. 단일 진실원은 여전히 저장소 파일이다.

**1) 큰 줄기 — 본문 vs 하단 버튼**

- `#app` 안 각 화면은 `.screen`(세로 flex, `min-height:0`).
- **위쪽 스크롤 영역**: `.screen-body` 또는 역할이 같은 래퍼. 긴 콘텐츠는 여기서만 `overflow-y:auto`(매칭 그리드·시도 안내 등).
- **아래 고정 줄**: `footer.screen-footer`. “도전 시작”이 아니라도 **화면마다 이름은 다르지만 위치는 동일 계열** — `padding: var(--footer-pad-y) var(--screen-pad-x)` + `padding-bottom: max(..., env(safe-area-inset-bottom))`.
- **예외**: 로비는 푸터 클래스명이 `.lobby-footer`이지만 **역할은 동일**(하단 버튼 줄). 패딩·`border-top`·`z-index`를 `screen-footer`와 맞춰 두었다.

**2) 디자인 토큰(숫자를 바꿀 때 여기부터)**

| 변수 | 대략 | 의미 |
|------|------|------|
| `--screen-pad-x` | 14px | 화면 좌우 안쪽 여백(카드·푸터 공통 기준) |
| `--section-gap` | 12px | 카드와 카드 **사이** 세로 간격(매칭 `screen-body--matching`의 `gap`) |
| `--footer-pad-y` | 12px | 하단 버튼 줄의 위·아래 패딩 |
| `--tap-target-min` | 48px | 푸터 주요 버튼 최소 높이(터치 안정성) |
| `--font-content` 등 | rem | 본문·라벨 가독성용; 스펙의 YAML `color`와 별개로 **글자 크기**만 담당 |
| `--lq-status-fixed-height` | ~4.35rem | `.clear-message` 계열 박스 동일 높이(로비 `#lobby-hint-message`도 `.clear-message` 클래스 사용 → 클리어 `#clear-message`와 리듬 맞출 때 참고) |

**3) 화면별 DOM 요약(푸터에 버튼이 있는 곳)**

- **MATCHING**: `footer.screen-footer` 안 `#btn-matching-continue` — 연출 전에는 `.hidden`, 이때는 **빈 푸터가 높이를 먹지 않음**(`:has(.hidden)` 규칙).
- **LOBBY**: 본문에 `#lobby-hint-message`(정적 힌트, JS 비연동) 후 `.lava-canvas-frame`·`#canvas-container`; 하단은 `.lobby-footer`에 `#btn-start-attempt`·`#btn-ranking`.
- **ATTEMPT**: `footer.screen-footer--attempt` 안 `.attempt-buttons`(성공/실패 2열).
- **CLEAR**: `footer` 안 `#btn-clear-continue`.
- **FAIL / FULL_CLEAR / REWARD**: 각각 해당 보상·확인 버튼을 동일 패턴으로 배치.
- **RANKING**: `ui_shell.ranking_screen` 참고 — **`.ranking-header` + `#rank-list`** 패턴, 하단 고정 CTA 없음(`#btn-ranking-close`만 상단).

**4) 매칭 그리드만의 규칙(다른 화면과 혼동 금지)**

- **데이터**: 봇 CSV는 100행 전후; **UI는 10×10 고정 열**이므로 CSS Grid로 열 수를 강제한다(flex-wrap으로 늘리면 마지막 줄이 가운데 정렬되어 “한 개만 덩그러니”처럼 보일 수 있음).
- **셀**: `.avatar-cell`이 점선 테두리; `.avatar-item`은 그 안에서 flex 가운데 정렬된 원(지름은 퍼센트로 조절해 패널 overflow를 막음).
- **그림자**: 원에는 **좌우 오프셋 그림자를 쓰지 않음**(시각적으로 오른쪽으로 밀린 것처럼 보이는 문제 방지).

**5) 후속 에이전트가 깨뜨리기 쉬운 것**

- `.avatar-stack` 또는 다른 카드에 **`width:100%`와 `margin-left/right`를 동시에** 주면 가로 합이 부모를 넘긴다 → **이미 `width:auto` + `align-self:stretch`로 수정됨**.
- 매칭 패널에 다시 **`flex:1`만** 주면 그리드 아래 **빈 박스**가 다시 커진다 → 내용 높이만 쓰려면 `flex:0 1 auto`.

### 순위·보상

- `ranking.js` 정렬 + `game.js` `renderRanking`: 줄마다 `.rk-dot` 원 마커 + 이름·클리어/탈락 텍스트(이모지 컬럼 없음).
- `renderWinIcons`: 생존자 수만큼 빈 `span.winner-avatar`(필요 시 `winner-avatar--me`) — CSV 이모지를 칩에 찍지 않음.
- 보상 그리드: 데모용 한글 텍스트 타일(`reward-tile`).

## Content Guidelines

### CSV (`public/`)

- `lq_bot_config.csv` — `bot_id`, `display_name`, `avatar_emoji`, `x_offset` (코드에서 마커 x bias에 반영).
- `lq_elimination_schedule.csv` — 레벨별 탈락 + `delay_ms`.
- `lq_level_config.csv` — `tip_text` 등, ATTEMPT 진입 시 `#attempt-tip`.
- `lq_event_config.csv` — 첫 데이터 행을 단일 `eventConfig` 객체로 사용(`grand_prize`, `duration_hours`, `event_name` …).

### 언어·복사

- 현재 `index.html` 카피는 한국어 중심. 스펙/마케팅 영문과 혼용하지 말고 변경 시 HTML·기획 문서를 한 벌로 맞출 것.

### 서버·매칭 (비구현)

- 매칭 연출은 클라이언트 타이머 데모. 향후 본편에서는 동일 `DataPack` 형태의 JSON을 주입하는 것을 권장하나, **현재 브랜치는 API 계층 없음**.

## Anti-Patterns

**[CRITICAL] `arenaMap.js` ↔ `players.js` export/import 불일치** — 빌드 중단. 공유 상수는 `players.js` 단일 정의 후 import.

**[CRITICAL] 랜덤 탈락** — 반드시 CSV. 서버 교체 시에도 스케줄 데이터만 갈아끼우는 형태 유지.

**[CRITICAL] 클리어 연출 순서 뒤집기** — 플레이어 전행 전에 대량 탈락을 먼저 그리면 기획 의도와 어긋남 (`playClearSuccessAnimation` 순서 유지).

**[CRITICAL] 리사이즈 시 window inner 크기로 WebGL setSize** — 컨테이너 `getBoundingClientRect` 기준(`setup.js`).

**[CRITICAL] WebGL 위에 상시 풀스크린 고정 레이어(z-index)** — 연출 가림. 실패 연출만 임시 노드.

**[CRITICAL] 스펙 MD에 HTML/CSS 전문 인라인** — 단일 진실원은 저장소의 `index.html` / `src/style.css`. 본 문서에는 **id 표**만.

**[CRITICAL] `#toast` 삭제** — `ui.showToast`, 부트스트랩 오류 안내 무발.

**[CRITICAL] `.screen` flex 열에서 `min-height:0` 누락** — 특히 ATTEMPT에서 버튼이 `overflow:hidden` 프레임 밖으로 잘림.

**[CRITICAL] 하단 CTA를 본문과 같은 flex 흐름에만 두고 `flex:1` 빈 공간에 묻기** — 화면마다 버튼 Y가 달라짐. `screen-body` + `screen-footer`로 분리할 것.

**[CRITICAL] `width:100%` + 좌우 `margin` on flex 자식** — #app 프레임 오른쪽으로 삐져나감. 여백은 부모 padding 또는 `width:auto`+stretch.

**[CRITICAL] 탈락 후 재도전** — `alive`에 0 없으면 ATTEMPT 진입 차단.

**[CRITICAL] dispose 누락** — 화면 전환 시 이전 `mountLavaScene` 인스턴스 `disposeScene`.

**[CRITICAL] 보상/초기화가 스토리지만 비우기** — `clearPersistentSession`만 호출하면 메모리의 `alive`·`clearsCompleted`와 불일치. 반드시 **`resetToFreshEvent` 패턴**(또는 동일한 필드 전부 초기화 + `persistSnapshot`) 후 매칭 재진입.

**[CRITICAL] `mountLavaScene`에 playerClears 생략** — 첫 레이아웃이 기본값 0으로 깔리면 HUD와 어긋남. 로비는 `clearsCompleted`, 클리어 연출 전 프레임은 `clearsCompleted-1`(코드: `bridgeTierBeforeWin`) 명시.

## Implementation Snapshot

| 영역 | 경로 / 메모 |
|------|-------------|
| 부트스트랩 | `src/main.js` |
| 세션·화면 루프 | `src/game.js` |
| 화면 토글·토스트 | `src/ui.js` (`showScreen` 시 토스트 숨김, 누락 화면이면 로비 복구 시도) |
| CSV·Storage | `src/data.js` — `SESSION_VERSION`, `LS_SESSION`, `save/load/clearPersistentSession` |
| 스케줄 수학 | `src/simulation.js` |
| 씬 조립 | `src/lavaScene.js` — `PACE`/`paceMs`, 연출 타임라인 |
| 마커·트윈 | `src/three/players.js` |
| 렌더러 | `src/three/setup.js`, `lava.js`, `bridge.js`, `arenaMap.js`, `dispose.js` |
| 스타일 | `src/style.css` — `:root` UI 토큰(`--lq-status-fixed-height` 등), `.screen-body` / `.screen-footer`, `.lava-canvas-frame` flex, `.btn-session-reset`, 매칭 grid·`:has` 푸터 접힘 |
| 마크업 | 루트 `index.html` |

## UI Implementation Details (UI Lead)

본 절은 **UI Lead(AntiGravity)**가 설계한 2D 인터페이스의 핵심 구현 가이드다. 다른 AI가 이 시스템을 재구현하거나 확장할 때 반드시 준수해야 하는 기술적 명세다.

### 1. HTML 마크업 전략 (index.html)
- **Screen-Based Architecture**: 모든 화면은 `#app` 직계 자식인 `.screen` 요소로 정의된다. 각 화면은 고유한 `id`(`screen-lobby`, `screen-attempt` 등)를 가지며, 초기 상태는 CSS로 숨겨진다.
- **Layout Hierarchy**: 
  - `.screen-body`: 콘텐츠가 담기는 스크롤 가능 영역.
  - `footer.screen-footer`: 하단에 고정되는 CTA(Call to Action) 버튼 영역.
- **Interactive Elements**: 모든 버튼과 HUD 요소는 명확한 `id`를 부여하여 `main.js`의 `ElRefs`를 통해 로직과 연결된다.

### 2. CSS 디자인 시스템 (src/style.css)
- **Design Tokens (:root)**:
  - `--screen-pad-x`: 14px (좌우 여백 표준)
  - `--footer-pad-y`: 12px (푸터 세로 여백)
  - `--section-gap`: 12px (컴포넌트 간 간격)
  - `--lq-status-fixed-height`: 상태 메시지 박스의 일관된 높이 확보.
- **Flexbox Layout Rules**: `.screen`은 `display: flex; flex-direction: column`을 사용하여 본문과 푸터를 상하로 분리하며, `min-height: 0`을 통해 모바일 뷰포트 내 스크롤을 제어한다.
- **Dark Theme Aesthetics**: 배경색 `#0a0a0a`와 스케치 풍의 `border` 스타일을 조합하여 프리미엄 다크 모드를 구현한다.
- **Safe-Area Handling**: 푸터 패딩에 `env(safe-area-inset-bottom)`를 적용하여 최신 기기의 노치 및 하단 바 간섭을 방지한다.

### 3. UI 로직 명세 (src/ui.js)
- **showScreen(screenId)**: 
  - 모든 `.screen`을 순회하며 숨기고, 대상 `screenId`만 활성화한다.
  - 화면 전환 시 활성 토스트가 있다면 자동으로 숨겨 시야 방해를 차단한다.
- **showToast(message, duration)**:
  - `#toast` 요소를 활용하여 사용자에게 알림을 제공한다.
  - `pointer-events: none` 설정을 통해 토스트가 버튼 클릭을 방해하지 않도록 처리한다.
- **Responsive Canvas**: `.lava-canvas-frame`의 크기 변화를 감지하여 Three.js 렌더러가 즉각적으로 대응하도록 설계되었다.

## Agent Audit Log (최신 작업 기록)
- (중략 - 이전 기록 보존)
- **2열 초밀착 배치**: 유닛들이 돌계단 위에서 앞뒤 0.24 간격으로 촘촘하게 서 있도록 레이아웃 수정.
- **카메라 프레임 최적화**: 하단 잘림 방지를 위해 `bottomTrim: 0` 및 `z: -4` 시선 중심점 적용.
- **다크 테마 고도화**: 배경과 유닛의 대비를 극대화하여 시인성 200% 향상.
