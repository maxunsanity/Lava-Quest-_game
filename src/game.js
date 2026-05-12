import { savePersistentSession, clearPersistentSession, SESSION_VERSION } from './data.js'
import { botIdToIndex, elimPlanForLevel } from './simulation.js'
import { mountLavaScene } from './lavaScene.js'
import { sortRanking } from './ranking.js'
import {
  attachAttemptFailFlash,
  attachSuccessFlash,
  frameWait,
  formatGrandPrize,
  setLevelsHud,
  setPlayersHud,
  showScreen,
  showToast,
} from './ui.js'

/**
 * CSV 묶음 + DOM 참조
 * @typedef {{
 *  botConfigRaw: Record<string,string>[],
 *  eliminationSchedule: Record<string,string>[],
 *  levelConfig: Record<string,string>[],
 *  eventConfig: Record<string,string>,
 * }} DataPack
 *
 * @typedef {{
 * prizeAmount: HTMLElement | null,
 * lobbyTimer: HTMLElement | null,
 * clearTimer: HTMLElement | null,
 * statLevels: HTMLElement | null,
 * statPlayers: HTMLElement | null,
 * attemptPlayers: HTMLElement | null,
 * attemptLevelNum: HTMLElement | null,
 * clearLevels: HTMLElement | null,
 * clearPlayers: HTMLElement | null,
 * failLevelEl: HTMLElement | null,
 * failClearCountEl: HTMLElement | null,
 * survivorsCountEl: HTMLElement | null,
 * shareCountEl: HTMLElement | null,
 * finalRankEl: HTMLElement | null,
 * finalClearCountEl: HTMLElement | null,
 * bonusMultiplierEl: HTMLElement | null,
 * rankList: HTMLElement | null,
 * winnerAvatars: HTMLElement | null,
 * rewardGrid: HTMLElement | null,
 * fullClearGoldOverlay: HTMLElement | null,
 * attemptFlash: HTMLElement | null,
 * attemptTip: HTMLElement | null,
 * attemptTimer: HTMLElement | null,
 * attemptPlayersAlive: HTMLElement | null,
 * }} ElRefs
 */

/**
 * @param {DataPack} data
 * @param {ElRefs} els
 * @param {{ persisted?: Record<string, unknown> | null }} [options]
 */
export function createGame(data, els, options = {}) {
  const bots = [...data.botConfigRaw].sort((a, b) => botIdToIndex(a.bot_id) - botIdToIndex(b.bot_id))

  const saveRaw = options.persisted
  let saveOk =
    saveRaw &&
    (saveRaw.version === 1 || saveRaw.version === SESSION_VERSION) &&
    Array.isArray(saveRaw.aliveIds) &&
    Array.isArray(saveRaw.clearsForRank) &&
    saveRaw.clearsForRank.length === bots.length

  /** @type {Set<number>} */
  let alive = new Set(
    saveOk
      ? /** @type {unknown[]} */ (saveRaw.aliveIds)
          .map((x) => Math.trunc(Number(x)))
          .filter((n) => Number.isFinite(n) && n >= 0 && n < bots.length)
      : bots.map((_, i) => i),
  )
  if (saveOk && alive.size === 0) {
    saveOk = false
    alive = new Set(bots.map((_, i) => i))
  }

  let clearsCompleted = saveOk ? Math.min(7, Math.max(0, Number(saveRaw.clearsCompleted) || 0)) : 0
  const clearsForRank = saveOk
    ? /** @type {unknown[]} */ (saveRaw.clearsForRank).map((n) => Math.max(0, Math.floor(Number(n) || 0)))
    : bots.map(() => 0)

  if (!saveOk) {
    alive = new Set(bots.map((_, i) => i))
    clearsCompleted = 0
    clearsForRank.length = 0
    bots.forEach((_, i) => {
      clearsForRank[i] = 0
    })
  }

  let busy = false
  /** 레벨 N 시도 중 실패 시 N (0클리어 탈락 순위용). 성공·로비 복귀 시 null */
  let meFailedAttemptLevel =
    saveOk && saveRaw?.meFailedAttemptLevel != null ? Number(saveRaw.meFailedAttemptLevel) : null

  /* 플레이어는 정렬된 봇 배열 인덱스 0 고정. 세이브 깨짐 등으로 0만 빠진 경우 생존 연속 재개를 위해 복구 */
  if (!alive.has(0) && meFailedAttemptLevel == null) {
    alive.add(0)
  }

  /** @type {ReturnType<typeof mountLavaScene>|null} */
  let lobbyScene = null
  /** @type {ReturnType<typeof mountLavaScene>|null} */
  let clearScene = null
  /** @type {ReturnType<typeof mountLavaScene>|null} */
  let attemptScene = null

  const evt = data.eventConfig
  let timerRemainMs = Number(evt.duration_hours ?? 24) * 3600 * 1000
  let timerTicker = /** @type {ReturnType<typeof setInterval>|null} */ (null)
  const prize = Number(evt.grand_prize ?? 10000)

  if (els.prizeAmount) els.prizeAmount.textContent = formatGrandPrize(prize)

  const fmtClock = (ms) => {
    let sec = Math.max(0, Math.floor(ms / 1000))
    const hh = Math.floor(sec / 3600)
    sec %= 3600
    const mm = Math.floor(sec / 60)
    const ss = sec % 60
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  }

  function syncClocks() {
    const text = fmtClock(timerRemainMs)
    if (els.lobbyTimer) els.lobbyTimer.textContent = text
    if (els.attemptTimer) els.attemptTimer.textContent = text
    if (els.clearTimer) els.clearTimer.textContent = text
  }

  function persistSnapshot() {
    savePersistentSession({
      version: SESSION_VERSION,
      clearsCompleted,
      aliveIds: [...alive].sort((a, b) => a - b),
      clearsForRank,
      meFailedAttemptLevel,
    })
  }

  /** 세이브 불일치·비현실 스냅샷 보정 (처음부터 7/7·완주 연출처럼 보이는 오염 방지) */
  if (saveOk) {
    const nAlive = alive.size
    let cc = Math.min(7, Math.max(0, Math.floor(Number(clearsCompleted) || 0)))
    clearsCompleted = cc
    const r0 = alive.has(0) ? Math.min(7, Math.max(0, Math.floor(Number(clearsForRank[0]) || 0))) : -1

    if (cc >= 7 && nAlive >= 99) {
      alive = new Set(bots.map((_, i) => i))
      clearsCompleted = 0
      for (let i = 0; i < bots.length; i++) clearsForRank[i] = 0
      meFailedAttemptLevel = null
      clearPersistentSession()
      saveOk = false
      persistSnapshot()
    } else if (r0 >= 0 && r0 !== cc) {
      clearsCompleted = r0
      for (const i of alive) clearsForRank[i] = r0
      persistSnapshot()
    }
  }

  function startTimerIfNeeded() {
    if (timerTicker) return
    syncClocks()
    timerTicker = window.setInterval(() => {
      timerRemainMs -= 1000
      syncClocks()
    }, 1000)
  }

  function refreshHud() {
    const aliveCnt = [...alive].length
    setLevelsHud(els, clearsCompleted)
    setPlayersHud(els, aliveCnt)
    if (els.attemptPlayersAlive) els.attemptPlayersAlive.textContent = `${aliveCnt}/100`
  }

  function disposeLobby() {
    lobbyScene?.disposeScene()
    lobbyScene = null
  }

  function disposeClear() {
    clearScene?.disposeScene()
    clearScene = null
  }

  function disposeAttempt() {
    attemptScene?.disposeScene()
    attemptScene = null
  }

  function bumpClearsAlive() {
    for (const idx of alive) clearsForRank[idx] += 1
  }

  function bumpClearsAliveRevert() {
    for (const idx of alive) clearsForRank[idx] = Math.max(0, clearsForRank[idx] - 1)
  }

  async function rebuildClear(container) {
    /* 화면 전환 직후 flex 높이·캔버스 0px 방지 */
    await frameWait(2)
    disposeClear()
    /*
     * 성공 직후 clearsCompleted는 이미 +1 된 값.
     * 연출: "이번 판 직전까지 선 위치"에서 출발 → 한 칸 전진 + 탈락.
     * bridgeTierBeforeWin === 완료한 돌 개수(0이면 첫 돌).
     */
    const bridgeTierBeforeWin = Math.max(0, clearsCompleted - 1)
    clearScene = mountLavaScene(container, bots, [...alive], {
      fleaIntro: true,
      playerClears: bridgeTierBeforeWin,
    })
    await clearScene.fleaIntroPromise
    clearScene?.updatePlayerClears(bridgeTierBeforeWin)
    refreshHud()
    persistSnapshot()
  }

  /** @typedef {{ idx:number, clears:number, elim:boolean, name:string, emoji:string }} R */

  /** @returns {R[]} */
  function rankRowsInternal() {
    /** @type {R[]} */
    const rows = bots.map((_b, i) => ({
      idx: i,
      clears: clearsForRank[i] || 0,
      elim: !alive.has(i),
      name: String(bots[i].display_name),
      emoji: String(bots[i].avatar_emoji),
    }))
    return rows
  }

  const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

  /** @returns {import('./ranking.js').PlayerRow[]} */
  function playerRowsForRankingSort() {
    return rankRowsInternal().map((r) => ({
      index: r.idx,
      botId: `bot_${String(r.idx + 1).padStart(3, '0')}`,
      displayName: r.name,
      emoji: r.emoji,
      clears: r.clears,
      eliminated: r.elim,
      eliminationLevel: r.elim ? (r.idx === 0 ? clearsCompleted : r.clears) : null,
      atLevelWhenFailed:
        r.elim && r.clears === 0
          ? r.idx === 0
            ? (meFailedAttemptLevel ?? 1)
            : 0
          : undefined,
    }))
  }

  function myRankOneBased() {
    const sorted = sortRanking(playerRowsForRankingSort())
    const ix = sorted.findIndex((p) => p.index === 0)
    return ix >= 0 ? ix + 1 : sorted.length
  }

  function renderRanking() {
    if (!els.rankList) return
    els.rankList.innerHTML = ''
    /** @typedef {import('./ranking.js').PlayerRow} Row */
    const ranked = sortRanking(playerRowsForRankingSort())

    ranked.forEach((row, ix) => {
      const dv = document.createElement('div')
      dv.className = 'rank-item'
      const me = row.index === 0
      if (me) dv.classList.add(row.eliminated ? 'me-out' : 'me')
      if (row.eliminated) dv.style.opacity = '0.62'
      dv.innerHTML =
        `<span class="rk-n">${ix + 1}</span>` +
        `<span class="rk-dot${me ? ' rk-dot--me' : ''}" aria-hidden="true"></span>` +
        `<span class="rk-t">${escapeHtml(row.displayName)}${me ? '<small>(나)</small>' : ''}</span>` +
        `<span class="rk-m">${row.eliminated ? '탈락' : `${row.clears} 클리어`}</span>`
      els.rankList.appendChild(dv)
    })
  }

  function renderWinIcons() {
    if (!els.winnerAvatars) return
    els.winnerAvatars.innerHTML = ''
    alive.forEach((idx) => {
      const chip = document.createElement('span')
      chip.className = 'winner-avatar' + (idx === 0 ? ' winner-avatar--me' : '')
      chip.setAttribute('aria-hidden', 'true')
      els.winnerAvatars.appendChild(chip)
    })
  }

  function rewardFill(rankOneBased) {
    if (els.finalRankEl) els.finalRankEl.textContent = String(rankOneBased)
    if (els.finalClearCountEl) els.finalClearCountEl.textContent = String(Math.min(clearsCompleted, 7))
    const bonus = clearsCompleted >= 7 ? '2.5' : clearsCompleted >= 6 ? '1.8' : clearsCompleted >= 4 ? '1.5' : '1'
    if (els.bonusMultiplierEl) els.bonusMultiplierEl.textContent = bonus
    if (!els.rewardGrid) return
    els.rewardGrid.innerHTML = ''
    const snaps = [
      { t: `${clearsCompleted >= 7 ? '고급 ' : ''}보석 묶음 보상` },
      { t: `주사위 ×${10 + clearsCompleted * 2}` },
      { t: clearsCompleted >= 7
        ? `예상 코인 분배: ${formatGrandPrize(Math.floor(prize / Math.max([...alive].length, 1)))}`
        : '코인 외 추가 보상(데모)'
      },
    ]
    snaps.forEach((s) => {
      const bx = document.createElement('div')
      bx.className = 'reward-tile sketch-panel'
      bx.textContent = s.t
      els.rewardGrid.appendChild(bx)
    })
  }

  async function lobbyEnter() {
    meFailedAttemptLevel = null
    /* 현재 플로우에서는 로비에 온 사용자는 항상 참가 가능해야 함(실패 화면은 별도 라우트) */
    if (!alive.has(0)) alive.add(0)
    showScreen('screen-lobby')
    startTimerIfNeeded()
    disposeLobby()
    disposeClear()
    disposeAttempt()
    const host = document.getElementById('canvas-container')
    if (!host) return
    await frameWait(2)

    lobbyScene = mountLavaScene(host, bots, [...alive], { playerClears: clearsCompleted })
    refreshHud()
    persistSnapshot()
  }

  /** 풀프레임 임시 캔버스 — 실패 낙하 연출용(평시 고정 오버레이 없음 → 본편 WebGL 가림 방지) */
  async function failAnimFullScreen() {
    const fxMount = document.createElement('div')
    fxMount.className = 'lq-fx-mount'
    fxMount.setAttribute('aria-hidden', 'true')
    document.body.appendChild(fxMount)
    const inner = document.createElement('div')
    Object.assign(inner.style, { width: '100%', height: '100%', pointerEvents: 'none' })
    fxMount.appendChild(inner)
    const temp = mountLavaScene(inner, bots, [...alive], { playerClears: clearsCompleted })
    const cnv = inner.querySelector('canvas')
    if (cnv instanceof HTMLCanvasElement) cnv.style.pointerEvents = 'none'
    try {
      await temp.animateSelfEliminate(() => attachAttemptFailFlash(els))
    } finally {
      temp.disposeScene()
      fxMount.remove()
    }
  }

  function resetToFreshEvent() {
    clearPersistentSession()
    alive = new Set(bots.map((_, i) => i))
    clearsCompleted = 0
    for (let i = 0; i < bots.length; i++) clearsForRank[i] = 0
    meFailedAttemptLevel = null
    busy = false
    disposeLobby()
    disposeClear()
    refreshHud()
    persistSnapshot()
  }

  function startMatchingAnimated() {
    document.getElementById('btn-matching-continue')?.classList.add('hidden')
    const mc = document.getElementById('match-current')
    if (mc) mc.textContent = '0'

    const stack = document.getElementById('avatar-stack')
    if (!stack) {
      void lobbyEnter()
      return
    }

    stack.innerHTML = ''
    bots.forEach((_, i) => {
      window.setTimeout(() => {
        const cell = document.createElement('div')
        cell.className = 'avatar-cell'
        cell.setAttribute('aria-hidden', 'true')
        const dv = document.createElement('div')
        dv.className = i === 0 ? 'avatar-item avatar-me' : 'avatar-item'
        dv.setAttribute('aria-hidden', 'true')
        cell.appendChild(dv)
        stack.appendChild(cell)
        requestAnimationFrame(() => dv.classList.add('avatar-item-in'))

        const cur = Math.min(i + 1, 100)
        const span = document.getElementById('match-current')
        if (span) span.textContent = String(cur)

        if (cur === 100) {
          window.setTimeout(() => document.getElementById('btn-matching-continue')?.classList.remove('hidden'), 450)
        }
      }, i * 32)
    })
  }

  return {
    startMatchingAnimated,

    attachHandlers() {
      document.getElementById('btn-matching-continue')?.addEventListener('click', () => {
        void lobbyEnter()
      })

      document.getElementById('btn-start-attempt')?.addEventListener('click', () => {
        if (!alive.has(0)) {
          alive.add(0)
          refreshHud()
          persistSnapshot()
        }
        if (busy) {
          showToast(null, '다른 처리가 진행 중입니다. 잠시 후 다시 눌러 주세요.')
          return
        }
        if (els.attemptPlayersAlive) els.attemptPlayersAlive.textContent = `${[...alive].length}/100`
        if (els.attemptLevelNum) els.attemptLevelNum.textContent = `${Math.min(7, clearsCompleted + 1)}/7`
        const tipLevel = Math.min(7, Math.max(1, clearsCompleted + 1))
        const levelRows = Array.isArray(data.levelConfig) ? data.levelConfig : []
        const tipRow = levelRows.find((r) => Number(r.level) === tipLevel)
        if (els.attemptTip) {
          els.attemptTip.textContent = tipRow?.tip_text
            ? String(tipRow.tip_text)
            : '성공하면 다음 레벨로 진행합니다'
        }
        
        disposeLobby()
        disposeClear()
        disposeAttempt()
        const hostAttempt = document.getElementById('canvas-container-attempt')
        if (hostAttempt) {
          attemptScene = mountLavaScene(hostAttempt, bots, [...alive], { playerClears: clearsCompleted })
        }
        
        showScreen('screen-attempt')
      })

      document.getElementById('btn-success')?.addEventListener('click', async () => {
        meFailedAttemptLevel = null
        if (busy || !alive.has(0)) {
          if (!alive.has(0)) {
            showToast(null, '이미 탈락했습니다. 보상 화면으로 이동하세요.')
          } else {
            showToast(null, '다른 처리가 진행 중입니다. 잠시 후 다시 눌러 주세요.')
          }
          return
        }
        busy = true

        try {
          attachSuccessFlash(els)
          const btnClr = document.getElementById('btn-clear-continue')
          disposeLobby()
          disposeClear()
          disposeAttempt()
          bumpClearsAlive()
          clearsCompleted = Math.min(7, clearsCompleted + 1)

          showScreen('screen-clear')
          if (els.clearLevels) els.clearLevels.textContent = `${clearsCompleted}/7`

          btnClr?.classList.add('hidden')
          btnClr?.setAttribute('disabled', '')

          const hostClear = document.getElementById('canvas-container-clear')
          if (!hostClear) {
            showToast(null, '화면 설정 오류: 연출 영역(canvas)이 없습니다.')
            showScreen('screen-attempt')
            clearsCompleted -= 1
            bumpClearsAliveRevert()
            btnClr?.classList.remove('hidden')
            btnClr?.removeAttribute('disabled')
            return
          }

          await rebuildClear(hostClear)
          const elimPlan = elimPlanForLevel(data.eliminationSchedule, clearsCompleted)
          await clearScene?.playClearSuccessAnimation(elimPlan, clearsCompleted)
          for (const step of elimPlan) {
            const ix = step.idx
            if (ix > 0 && alive.has(ix)) alive.delete(ix)
          }

          refreshHud()
          persistSnapshot()

          if (els.clearLevels) els.clearLevels.textContent = `${clearsCompleted}/7`
          if (els.clearPlayers) els.clearPlayers.textContent = `${[...alive].length}/100`

          btnClr?.classList.remove('hidden')
          btnClr?.removeAttribute('disabled')
        } catch (e) {
          console.error(e)

          clearsCompleted = Math.max(0, clearsCompleted - 1)
          bumpClearsAliveRevert()
          showToast(null, `연출 중 오류: ${e instanceof Error ? e.message : String(e)} (새로고침 권장)`)
          showScreen('screen-lobby')

          disposeClear()
          void lobbyEnter()

          const btnClrE = document.getElementById('btn-clear-continue')
          btnClrE?.classList.remove('hidden')
          btnClrE?.removeAttribute('disabled')
        } finally {
          busy = false
        }
      })

      document.getElementById('btn-fail')?.addEventListener('click', async () => {
        if (busy || !alive.has(0)) {
          if (!alive.has(0)) showToast(null, '이미 탈락했습니다.')
          else showToast(null, '다른 처리가 진행 중입니다.')
          return
        }

        busy = true
        try {
          meFailedAttemptLevel = Math.min(7, clearsCompleted + 1)
          disposeLobby()
          disposeClear()
          await failAnimFullScreen()
          alive.delete(0)
          setPlayersHud(els, [...alive].length)
          if (els.failLevelEl) els.failLevelEl.textContent = String(Math.min(clearsCompleted + 1, 7))
          if (els.failClearCountEl) els.failClearCountEl.textContent = String(clearsCompleted)
          showScreen('screen-fail')
          persistSnapshot()
        } catch (e) {
          console.error(e)

          showToast(null, `실패 연출 오류: ${e instanceof Error ? e.message : String(e)}`)
          disposeClear()
          void lobbyEnter()
        } finally {
          busy = false
        }
      })

      document.getElementById('btn-clear-continue')?.addEventListener('click', async () => {
        const btnClr = document.getElementById('btn-clear-continue')
        if (btnClr?.disabled || btnClr?.classList.contains('hidden')) {
          showToast(null, '탈락 연출이 끝난 뒤에 눌러 주세요.')
          return
        }
        if (busy) {
          showToast(null, '잠시만 기다려 주세요.')
          return
        }
        disposeClear()

        if (clearsCompleted >= 7) {
          if (els.survivorsCountEl) els.survivorsCountEl.textContent = String([...alive].length)

          if (els.shareCountEl) els.shareCountEl.textContent = String(Math.max(0, [...alive].length - 1))
          renderWinIcons()
          if (els.fullClearGoldOverlay) {
            els.fullClearGoldOverlay.style.transition = ''
            els.fullClearGoldOverlay.style.opacity = '0'
            requestAnimationFrame(() => {
              els.fullClearGoldOverlay.style.transition = 'opacity 420ms linear'
              els.fullClearGoldOverlay.style.opacity = '0.93'
              window.setTimeout(() => {
                els.fullClearGoldOverlay.style.opacity = '0'
              }, 520)
            })
          }

          disposeLobby()

          disposeClear()


          showScreen('screen-full-clear')
          return
        }

        disposeLobby()

        await lobbyEnter()
      })

      document.getElementById('btn-full-clear-reward')?.addEventListener('click', () => {
        disposeLobby()
        disposeClear()
        rewardFill(myRankOneBased())
        showScreen('screen-reward')
      })

      document.getElementById('btn-fail-reward')?.addEventListener('click', () => {
        disposeLobby()

        disposeClear()

        rewardFill(myRankOneBased())
        showScreen('screen-reward')
      })

      document.getElementById('btn-ranking')?.addEventListener('click', () => {
        if (!els.rankList) {
          showToast(null, '순위 UI(#rank-list)가 없어 표시를 건너뜁니다.')
          return
        }
        renderRanking()
        showScreen('screen-ranking')
      })

      document.getElementById('btn-ranking-close')?.addEventListener('click', () => {
        showScreen('screen-lobby')
      })

      document.getElementById('btn-reward-confirm')?.addEventListener('click', () => {
        resetToFreshEvent()
        showScreen('screen-matching')
        showToast(null, '새 이벤트로 초기화했어요. 매칭부터 다시 시작해요.', 2600)
        startMatchingAnimated()
      })

      document.getElementById('btn-lobby-info')?.addEventListener('click', () => {
        showToast(null, evt.event_name ?? '용암 퀘스트')
      })

      document.getElementById('btn-session-reset')?.addEventListener('click', () => {
        if (!window.confirm('저장된 진행을 모두 지우고 처음부터 시작할까요?')) return
        resetToFreshEvent()
        showScreen('screen-matching')
        showToast(null, '초기화했어요. 매칭부터 다시 해요.', 2400)
        startMatchingAnimated()
      })

      refreshHud()
    },
  }
}
