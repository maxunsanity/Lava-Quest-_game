const LS_SESSION = 'lq_session_v1'
const LS_PLAYER = 'lq_player_v1'

/** 세이브 스키마. 올리면 main·createGame에서 구버전과 함께 로드 규칙을 맞출 것 */
export const SESSION_VERSION = 2

/** RFC 4180-style CSV rows (quotes, escaped quotes). Returns array of plain objects keyed by header. */
export function parseCsv(text) {
  const rows = []
  let i = 0
  const row = []
  let field = ''
  let inQuotes = false
  while (i < text.length) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        const next = text[i + 1]
        if (next === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
        i += 1
        continue
      }
      field += c
      i += 1
      continue
    }
    if (c === '"') {
      inQuotes = true
      i += 1
      continue
    }
    if (c === ',') {
      row.push(field)
      field = ''
      i += 1
      continue
    }
    if (c === '\r') {
      i += 1
      continue
    }
    if (c === '\n') {
      row.push(field)
      if (row.some(cell => cell.length > 0)) rows.push(row.slice())
      row.length = 0
      field = ''
      i += 1
      continue
    }
    field += c
    i += 1
  }
  row.push(field)
  if (row.some(cell => cell.length > 0)) rows.push(row.slice())

  if (rows.length === 0) return []
  const header = rows[0].map(h => h.trim())
  return rows.slice(1).map(cells => {
    const obj = {}
    header.forEach((key, idx) => {
      obj[key] = (cells[idx] ?? '').trim()
    })
    return obj
  })
}

/** Vite base(서브경로 배포·./ 빌드)와 맞춰 CSV를 로드한다. */
export async function fetchCsv(path) {
  const rel = String(path).replace(/^\//, '')
  const base = import.meta.env.BASE_URL ?? '/'
  const prefix = base.endsWith('/') ? base : `${base}/`
  const url = `${prefix}${rel}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`CSV fetch failed: ${url} (${res.status})`)
  return parseCsv(await res.text())
}

export function loadPersistentSession() {
  try {
    const raw = localStorage.getItem(LS_SESSION)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePersistentSession(data) {
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify(data))
  } catch {}
}

export function clearPersistentSession() {
  try {
    localStorage.removeItem(LS_SESSION)
  } catch {}
}

export function loadPersistentPlayer() {
  try {
    const raw = localStorage.getItem(LS_PLAYER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePersistentPlayer(data) {
  try {
    localStorage.setItem(LS_PLAYER, JSON.stringify(data))
  } catch {}
}

export { LS_SESSION, LS_PLAYER }
