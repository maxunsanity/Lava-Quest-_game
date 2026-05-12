import { savePersistentSession, clearPersistentSession } from './data.js'
import { botIdToIndex, elimPlanForLevel } from './simulation.js'
import { mountLavaScene } from './lavaScene.js'
import { sortRanking } from './ranking.js'
import {
  attachAttemptFailFlash,
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
    saveRaw.version === 1 &&
    Array.isArray(saveRaw.aliveIds) &&
    Array.isArray(saveRaw.clearsForRank) &&
    saveRaw.clearsForRank.length === bots.length

  /** @type {Set<number>} */
  let alive = new Set(
    saveOk
      ? /** @type {unknown[]} */ (saveRaw.aliveIds)
          .map((x) => Number(x))
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
  let meFailedAttemptLevel = /** @type {number | null} */ (
    saveOk && saveRaw?.meFailedAttemptLevel != null ? Number(saveRaw.meFailedAttemptLevel) : null,
  )
  /** @type {ReturnType<typeof mountLavaScene>|null} */
  let lobbyScene = null
  /** @type {ReturnType<typeof mountLavaScene>|null} */
  let clearScene = null

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
    if (els.clearTimer) els.clearTimer.textContent = text
  }

  function persistSnapshot() {
    savePersistentSession({
      version: 1,
      clearsCompleted,
      aliveIds: [...alive].sort((a, b) => a - b),
      clearsForRank,
      meFailedAttemptLevel,
    })
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
  }

  function disposeLobby() {
    lobbyScene?.disposeScene()
    lobbyScene = null
  }

  function disposeClear() {
    clearScene?.disposeScene()
    clearScene = null
  }

  function bumpClearsAlive() {
    for (const idx of alive) clearsForRank[idx] += 1
  }

  function bumpClearsAliveRevert() {
    for (const idx of alive) clearsForRank[idx] = Math.max(0, clearsForRank[idx] - 1)
  }

  async function rebuildClear(container) {
    await frameWait(1)
    disposeClear()
    const clearsForScene = Math.max(0, clearsCompleted - 1)
    clearScene = mountLavaScene(container, bots, [...alive], {
      fleaIntro: true,
      playerClears: clearsForScene,
    })
    await clearScene.fleaIntroPromise
    clearScene?.updatePlayerClears(clearsForScene)
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
        `<span class="rk-e">${escapeHtml(row.emoji)}</span>` +
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
      chip.className = 'winner-avatar'
      chip.textContent = String(bots[idx].avatar_emoji)
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
      { t: `${clearsCompleted >= 7 ? '💎' : '🔸'} 보석 묶음 보상` },
      { t: `🎲 주사위 ×${10 + clearsCompleted * 2}` },
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
    showScreen('screen-lobby')
    startTimerIfNeeded()
    disposeLobby()
    disposeClear()
    const host = document.getElementById('canvas-container')
    if (!host) return
    await frameWait(1)
    disposeLobby()

    lobbyScene = mountLavaScene(host, bots, [...alive])
    lobbyScene.updatePlayerClears(clearsCompleted)
    refreshHud()
    persistSnapshot()
  }

  function fxMountEl() {
    let el = document.getElementById('lq-fx-mount')
    if (!el) {
      el = document.createElement('div')
      el.id = 'lq-fx-mount'
      el.className = 'lq-fx-mount'
      el.setAttribute('aria-hidden', 'true')
      document.body.appendChild(el)
    }
    return el
  }

  const fxMount = fxMountEl()

  /** 풀프레임 임시 캔버스 — 실패 낙하 연출용 (#screen-attempt는 캔버스 노드 미정의) */
  async function failAnimFullScreen() {
    fxMount.innerHTML = ''
    fxMount.style.pointerEvents = 'none'
    const inner = document.createElement('div')
    Object.assign(inner.style, { width: '100%', height: '100%', pointerEvents: 'none' })
    fxMount.appendChild(inner)
    const temp = mountLavaScene(inner, bots, [...alive])
    const cnv = inner.querySelector('canvas')
    if (cnv instanceof HTMLCanvasElement) cnv.style.pointerEvents = 'none'
    await temp.animateSelfEliminate(() => attachAttemptFailFlash(els))
    temp.disposeScene()
    fxMount.innerHTML = ''
  }

  return {
    startMatchingAnimated() {
      const stack = document.getElementById('avatar-stack')
      if (!stack) {
        void lobbyEnter()
        return
      }

      stack.innerHTML = ''
      bots.forEach((_, i) => {
        window.setTimeout(() => {
          const dv = document.createElement('div')
          dv.className = i === 0 ? 'avatar-item avatar-me' : 'avatar-item'
          dv.setAttribute('aria-hidden', 'true')
          stack.appendChild(dv)
          requestAnimationFrame(() => dv.classList.add('avatar-item-in'))

          const cur = Math.min(i + 1, 100)
          const span = document.getElementById('match-current')
          if (span) span.textContent = String(cur)

          if (cur === 100) {
            window.setTimeout(() => document.getElementById('btn-matching-continue')?.classList.remove('hidden'), 720)
          }
        }, i * 50)
      })
    },

    resumeFromLobby() {
      void lobbyEnter()
    },

    attachHandlers() {
      document.getElementById('btn-matching-continue')?.addEventListener('click', () => {
        void lobbyEnter()
      })

      document.getElementById('btn-start-attempt')?.addEventListener('click', () => {
        if (busy || !alive.has(0)) {
          showToast(null, !alive.has(0) ? '이미 탈락했습니다. 보상 화면으로 이동하세요.' : '다른 처리가 진행 중입니다. 잠시 후 다시 눌러 주세요.')
          return
        }
        if (els.attemptPlayers) els.attemptPlayers.textContent = String([...alive].length)

        if (els.attemptLevelNum) els.attemptLevelNum.textContent = String(Math.min(7, clearsCompleted + 1))
        const tipLevel = Math.min(7, Math.max(1, clearsCompleted + 1))
        const tipRow = data.levelConfig.find((r) => Number(r.level) === tipLevel)
        if (els.attemptTip) {
          els.attemptTip.textContent = tipRow?.tip_text
            ? String(tipRow.tip_text)
            : '성공하면 다음 레벨로 진행합니다'
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
          const btnClr = document.getElementById('btn-clear-continue')
          disposeLobby()
          disposeClear()
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
        clearPersistentSession()
        showToast(null, '세션을 종료했습니다. 다시 시작하려면 새로고침하세요.')
      })

      document.getElementById('btn-lobby-info')?.addEventListener('click', () => {
        showToast(null, evt.event_name ?? '용암 퀘스트')
      })

      refreshHud()
    },
  }
}
