/**
 * @typedef {{ level: number, bot_id: string, delay_ms: number }} ElimEntry
 * @typedef {{ idx: number, delay_ms: number }} ElimPlanStep
 */

/** @param {ElimEntry[]} data */
export function getScheduleForLevel(data, level) {
  const n = Number(level)
  return data.filter((e) => Number(e.level) === n)
}

export function botIdToIndex(botId) {
  const m = /^bot_(\d+)$/.exec(botId.trim())
  if (!m) return -1
  return Number.parseInt(m[1], 10) - 1
}

export async function delay(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * CSV `delay_ms` 오름차순으로 탈락 연출(같은 봇은 가장 이른 시각만).
 * @param {Record<string,string>[]} scheduleRows
 * @param {number} level
 * @returns {ElimPlanStep[]}
 */
export function elimPlanForLevel(scheduleRows, level) {
  const list = getScheduleForLevel(/** @type {ElimEntry[]} */ (scheduleRows), level)
  /** @type {Map<number, number>} */
  const earliest = new Map()
  for (const row of list) {
    const ix = botIdToIndex(row.bot_id)
    if (ix <= 0) continue
    const delay_ms = Number.parseFloat(String(row.delay_ms ?? '0')) || 0
    const prev = earliest.get(ix)
    if (prev === undefined || delay_ms < prev) earliest.set(ix, delay_ms)
  }
  return [...earliest.entries()]
    .map(([idx, delay_ms]) => ({ idx, delay_ms }))
    .sort((a, b) => a.delay_ms - b.delay_ms || a.idx - b.idx)
}

/** 레벨 클리어 시 탈락 처리할 보트 인덱스(플레이어 제외·중복 제거) */
export function elimIndicesForLevel(scheduleRows, level) {
  return elimPlanForLevel(scheduleRows, level).map((s) => s.idx)
}
