/**
 * @typedef {{ index: number, botId: string, displayName: string, emoji: string, clears: number, eliminated: boolean, eliminationLevel: number | null, atLevelWhenFailed?: number }} PlayerRow
 */

/**
 * @param {PlayerRow[]} players
 * @returns {PlayerRow[]} sorted for leaderboard (연속 클리어 우선 등)
 */
export function sortRanking(players) {
  const rankKey = (p) => {
    if (!p.eliminated) return [2, p.clears, -p.index]
    if (p.clears > 0) return [1, p.clears, (p.eliminationLevel ?? 0), -p.index]
    // clears=0 & 탈락: 실패한 레벨이 높을수록 상위(앞 순번) — 세 번째 키는 내림차순 정렬되도록 큰 값이 앞으로
    return [0, (p.eliminationLevel ?? 0), (p.atLevelWhenFailed ?? 0), -p.index]
  }
  const out = [...players]
  out.sort((a, b) => {
    const ka = rankKey(a)
    const kb = rankKey(b)
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
      const va = ka[i] ?? 0
      const vb = kb[i] ?? 0
      if (va !== vb) return vb - va
    }
    return a.index - b.index
  })
  return out
}
