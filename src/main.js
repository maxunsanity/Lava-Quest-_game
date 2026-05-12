import './style.css'
import { fetchCsv, loadPersistentSession, SESSION_VERSION } from './data.js'
import { createGame } from './game.js'

function el(id) {
  return document.getElementById(id)
}

async function bootstrap() {
  const [
    botConfigRaw,
    eliminationSchedule,
    _lqLevels,
    eventCsv,
  ] = await Promise.all([
    fetchCsv('/lq_bot_config.csv'),
    fetchCsv('/lq_elimination_schedule.csv'),
    fetchCsv('/lq_level_config.csv'),
    fetchCsv('/lq_event_config.csv'),
  ])

  /** @type {Record<string,string>} */
  const eventConfig = /** @type {Record<string,string>} */ (eventCsv[0]) || {}

  const persisted = loadPersistentSession()
  const resumeOk =
    !!(
      persisted &&
      (persisted.version === 1 || persisted.version === SESSION_VERSION) &&
      Array.isArray(persisted.aliveIds) &&
      Array.isArray(persisted.clearsForRank) &&
      persisted.clearsForRank.length === botConfigRaw.length
    )

  const game = createGame(
    { botConfigRaw, eliminationSchedule, levelConfig: _lqLevels, eventConfig },
    {
      prizeAmount: el('prize-amount'),
      lobbyTimer: el('lobby-timer'),
      clearTimer: el('clear-timer'),
      statLevels: el('stat-levels'),
      statPlayers: el('stat-players'),
      attemptPlayers: el('attempt-players-alive'),
      attemptLevelNum: el('attempt-level-num'),
      attemptTip: el('attempt-tip'),
      attemptTimer: el('attempt-timer'),
      attemptPlayersAlive: el('attempt-players-alive'),
      clearLevels: el('clear-levels'),
      clearPlayers: el('clear-players'),
      failLevelEl: el('fail-level'),
      failClearCountEl: el('fail-clear-count'),
      survivorsCountEl: el('survivors-count'),
      shareCountEl: el('share-count'),
      finalRankEl: el('final-rank'),
      finalClearCountEl: el('final-clear-count'),
      bonusMultiplierEl: el('bonus-multiplier'),
      rankList: el('rank-list'),
      winnerAvatars: el('winner-avatars'),
      rewardGrid: el('reward-grid'),
      fullClearGoldOverlay: el('full-clear-overlay'),
      attemptFlash: el('attempt-flash-overlay'),
    },
    { persisted: resumeOk ? persisted : null },
  )

  game.attachHandlers()
  /* 세이브는 createGame에서 복원되지만, 첫 화면(매칭)은 항상 보여준 뒤 「계속」으로 로비 진입 */
  game.startMatchingAnimated()
}

bootstrap().catch((err) => {
  console.error(err)
  document.getElementById('toast')?.classList?.remove('hidden')
  const t = document.getElementById('toast')
    if (t) {
      const hint = err instanceof Error ? err.message : String(err)
      t.textContent = `시작하지 못했습니다. 원인: ${hint}. Vite로 연 주소인지 확인하세요(예: npm run dev 또는 npm run preview).`
    }
})
