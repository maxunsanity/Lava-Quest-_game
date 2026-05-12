/** DOM ids — Lava Quest 화면 전환 (클리어 화면 타이머 등 프로젝트 UI와 동기화) */

const SCREEN_IDS = [
  'screen-matching',
  'screen-lobby',
  'screen-attempt',
  'screen-clear',
  'screen-fail',
  'screen-full-clear',
  'screen-ranking',
  'screen-reward',
]

export function hideAllScreens() {
  SCREEN_IDS.forEach((id) => {
    document.getElementById(id)?.classList.add('hidden')
  })
}

export function showScreen(screenId) {
  hideAllScreens()
  document.getElementById('toast')?.classList.add('hidden')
  const target = document.getElementById(screenId)
  if (!target) {
    console.error('[LQ] missing screen element:', screenId)
    document.getElementById('screen-lobby')?.classList.remove('hidden')
    return
  }
  target.classList.remove('hidden')
}

export function showToast(appElOrNull, msg, ms = 2200) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = msg
  toast.classList.remove('hidden')
  window.clearTimeout(showToast._t)
  showToast._t = window.setTimeout(() => toast.classList.add('hidden'), ms)
}

export function formatLevels(clearedCompleted, max = 7) {
  return `${clearedCompleted}/${max}`
}

export function formatAlive(aliveNow, capacity = 100) {
  return `${aliveNow}/${capacity}`
}

export function formatGrandPrize(n) {
  const num = typeof n === 'number' ? n : Number.parseInt(String(n).replace(/,/g, ''), 10)
  return Number.isFinite(num) ? num.toLocaleString('ko-KR') : String(n)
}

export function setPlayersHud(elements, aliveTotal) {
  const text = formatAlive(aliveTotal)
  if (elements.statPlayers) elements.statPlayers.textContent = text
  if (elements.attemptPlayers) elements.attemptPlayers.textContent = text
  if (elements.attemptPlayersAlive) elements.attemptPlayersAlive.textContent = text
  if (elements.clearPlayers) elements.clearPlayers.textContent = text
}

export function setLevelsHud(elements, clears) {
  const text = formatLevels(clears)
  if (elements.statLevels) elements.statLevels.textContent = text
  if (elements.attemptLevelNum) elements.attemptLevelNum.textContent = text
  if (elements.clearLevels) elements.clearLevels.textContent = text
}

export async function frameWait(times = 1) {
  for (let i = 0; i < times; i++) await new Promise((r) => requestAnimationFrame(() => r()))
}

export function attachAttemptFailFlash(elements) {
  const el = elements.attemptFlash
  if (!el) return
  el.style.transition = 'none'
  el.style.opacity = '0'
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 520ms ease'
    el.style.opacity = '0.55'
    window.setTimeout(() => {
      el.style.opacity = '0'
    }, 520)
  })
}
export function attachSuccessFlash(elements) {
  const el = elements.attemptFlash
  if (!el) return
  el.classList.add('lq-flash-overlay--success')
  el.style.transition = 'none'
  el.style.opacity = '0'
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 400ms ease-out'
    el.style.opacity = '1'
    window.setTimeout(() => {
      el.style.opacity = '0'
      window.setTimeout(() => {
        el.classList.remove('lq-flash-overlay--success')
      }, 400)
    }, 150)
  })
}
