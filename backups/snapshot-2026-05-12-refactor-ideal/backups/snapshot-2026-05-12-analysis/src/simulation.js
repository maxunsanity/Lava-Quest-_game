/** @typedef {{ level: number, bot_id: string, delay_ms: number }} ElimEntry */

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

/** 레벨 클리어 시 탈락 처리할 보트 인덱스(중복 제거·유효 id만) */
export function elimIndicesForLevel(scheduleRows, level) {
  const list = getScheduleForLevel(scheduleRows, level)
  const seen = /** @type {Set<number>} */ (new Set())
  for (const row of list) {
    const ix = botIdToIndex(row.bot_id)
    if (ix >= 0) seen.add(ix)
  }
  return [...seen]
}
