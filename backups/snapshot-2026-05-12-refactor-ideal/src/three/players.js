import * as THREE from 'three'

export const PLAYER_START_Z = 12 // 시작 위치를 더 뒤로 밀어서 광장 확보
export const STEP_Z_DELTA = -5.5 // 간격을 더 넓게
export const LAVA_FRUSTUM_HALF_H = 30 // 가시 영역 확대

export const TOP_VIEW_LOOK_AT = Object.freeze({ x: 0, y: -3.03, z: -12 })

export let CAMERA_LOOK_Y = TOP_VIEW_LOOK_AT.y

/** @param {number} y */
export function syncCameraLookYWorld(y) {
  CAMERA_LOOK_Y = y
}

/** Orthographic 세로 높이 기준 픽셀 1단위 길이(월드). 지름 Npx 디스크 → 반지름 wpp × (N/2) */
export function worldUnitsPerPixel(orthographicCamera, canvasHeightPx) {
  const span = orthographicCamera.top - orthographicCamera.bottom
  return span / Math.max(canvasHeightPx, 1)
}

/** 화면 기준 브릿지/용암 루트를 위로 들어올릴 만큼(월드) */
export function bridgeLiftWorldForPixels(containerEl, pixelDelta, orthoHalfH = LAVA_FRUSTUM_HALF_H) {
  const h = Math.max(24, Math.floor(containerEl?.getBoundingClientRect?.()?.height ?? 560))
  return (2 * orthoHalfH / h) * pixelDelta
}

export function zForClears(clears) {
  return PLAYER_START_Z + clears * STEP_Z_DELTA
}

/** 돌다리·마커 좌우 지그재그 폭(월드). tier 7(보물 구역)은 X=0에 모음 */
export const ZIG_X_AMPLITUDE = 3.4

/**
 * @param {number} tier 레벨 진행 0…7 (7=보물섬 근처)
 * @returns {number} 해당 티어 중심 X
 */
export function zigXForTier(tier) {
  const t = THREE.MathUtils.clamp(Math.floor(tier), 0, 7)
  if (t >= 7) return 0
  return (t % 2 === 0 ? 1 : -1) * ZIG_X_AMPLITUDE
}

/**
 * 탑뷰에서 경로·시작 클러스터를 화면 위쪽(시야 중심 쪽)으로 올리는 Z 보정
 */
export const MARKER_Z_BIAS = 5.5

function ringOffset(slot, count) {
  const ringSlot = slot % Math.max(Math.min(count, 9), 1)
  const a = ringSlot / Math.min(count || 9, 9)
  const ang = (a + (slot >>> 6) % 7 * 0.04) * Math.PI * 2
  return { dx: Math.cos(ang) * 1.55, dz: Math.sin(ang) * 0.32 }
}

function markerMaterial(isMe) {
  return new THREE.MeshBasicMaterial({
    color: isMe ? 0x1a6fd4 : 0x999999, // 나: 파랑, 봇: 회색
    depthTest: false,
    depthWrite: false,
    transparent: true,
    opacity: 1.0,
  })
}

/**
 * @returns {THREE.Mesh[]}
 */
export function createPlayerSprites(scene, bots, markerRadiusWorld = 0.35) {
  const meshes = []
  const segments = 32 // 원을 더 부드럽게
  for (let i = 0; i < bots.length; i++) {
    const geo = new THREE.CircleGeometry(markerRadiusWorld, segments)
    const mesh = new THREE.Mesh(geo, markerMaterial(i === 0))
    mesh.rotation.x = -Math.PI / 2
    mesh.name = `lq-p-${i}`
    mesh.userData = { id: i } // ID 정보 주입! 🔞💋
    mesh.renderOrder = 20000 + i // 다른 레이어보다 위에
    mesh.visible = false
    scene.add(mesh)
    meshes.push(mesh)
  }
  return meshes
}

/**
 * 성공 후 생존자 3파동 분할 (예: 10 → 4+3+3)
 * @returns {[number, number, number]}
 */
export function survivorWaveSizes(total) {
  const n = Math.max(0, Math.floor(total))
  if (n === 0) return [0, 0, 0]
  const a = Math.ceil(n / 3)
  const r1 = n - a
  const b = Math.ceil(r1 / 2)
  const c = n - a - b
  return [a, b, c]
}

/** @param {number[]} sortedSurvivors */
export function survivorWaves(sortedSurvivors) {
  const [a, b, c] = survivorWaveSizes(sortedSurvivors.length)
  const w1 = sortedSurvivors.slice(0, a)
  const w2 = sortedSurvivors.slice(a, a + b)
  const w3 = sortedSurvivors.slice(a + b, a + b + c)
  return [w1, w2, w3]
}

/** alive 집합 기준 같은 클러스터 레이아웃 좌표 */
export function computeClusterTargets(aliveSet, playerClears, bots) {
  const out = {}
  const DECK_Y = -5.74

  const aliveSorted = [...aliveSet].sort((a, b) => {
    if (a === 0 && b !== 0) return -1
    if (b === 0 && a !== 0) return 1
    return a - b
  })

  aliveSorted.forEach((idx, slot) => {
    let tier = THREE.MathUtils.clamp(playerClears, 0, 7)
    let cz = zForClears(tier)
    
    const ring = ringOffset(slot, aliveSorted.length)
    // 아이콘이 커졌으니 겹치지 않게 간격을 살짝 조정했어 💋
    const ringScale = idx === 0 ? 0.05 : 1.1 

    const xo = Number.parseFloat(String(bots[idx]?.x_offset ?? '0')) || 0
    const xBias = THREE.MathUtils.clamp(xo * 0.2 + ring.dx * ringScale, -2.5, 2.5)

    out[idx] = {
      x: xBias,
      y: DECK_Y + (slot % 4) * 0.01 + (idx === 0 ? 0.05 : 0),
      z: cz + ring.dz * ringScale,
    }
  })

  return out
}

/**
 * @param {THREE.Mesh[]} sprites
 */
export function layoutAliveCluster(sprites, aliveSet, playerClears, bots) {
  const targets = computeClusterTargets(aliveSet, playerClears, bots)
  for (const idx of aliveSet) {
    const mesh = sprites[idx]
    const t = targets[idx]
    if (!t || !mesh) continue
    mesh.position.set(t.x, t.y, t.z)
    mesh.rotation.x = -Math.PI / 2
    mesh.visible = true
  }
}

const LAVA_SCATTER_DECK_Y = -5.74

/** 클리어 인트로: 용암 면 넓게 흩어진 듯한 시작 좌표 (돌다리 쪽으로 점프하기 전) */
export function layoutLavaScatter(sprites, aliveSet) {
  for (const idx of aliveSet) {
    const mesh = sprites[idx]
    if (!mesh) continue
    const slot = [...aliveSet].sort((a, b) => a - b).indexOf(idx)
    const u = (((idx * 7919 + slot * 127) >>> 0) % 9973) / 9973
    const v = (((idx + slot * 17) * 1237) >>> 0) % 9833 / 9833
    const x = -10.2 + u * 20.4
    const z = 10.8 + v * 12.5
    mesh.position.set(x, LAVA_SCATTER_DECK_Y + 0.05, z)
    mesh.rotation.x = -Math.PI / 2
    mesh.visible = true
  }
}

/** 벼룩처럼 튀어 오르는 포물선 이동 (Y축 추가) 🔞💋 */
export function tweenJump(obj, end, durMs, jumpH = 1.4, easeFn = quadOut) {
  const start = obj.position.clone()
  const dest = new THREE.Vector3(end.x, end.y, end.z)
  
  // 오빠 원(0번)은 무조건 맨 위로! 🔞💋
  if (obj.userData?.id === 0) {
    obj.renderOrder = 999
    if (obj.material) obj.material.depthTest = false // 다른 원들에 안 가려지게
  }

  const t0 = performance.now()
  return new Promise((resolve) => {
    function frame(now) {
      const k = Math.min(1, (now - t0) / durMs)
      const ek = easeFn(k)
      obj.position.x = THREE.MathUtils.lerp(start.x, dest.x, ek)
      obj.position.z = THREE.MathUtils.lerp(start.z, dest.z, ek)
      
      // 포물선 Y축 시원하게 강화! 🔞💋
      const jump = Math.sin(k * Math.PI) * jumpH
      obj.position.y = THREE.MathUtils.lerp(start.y, dest.y, ek) + jump
      
      if (k >= 1) resolve()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

/** 벼룩 홉 애니메이션 (Y축 보정 버전) */
export async function tweenFleaHops(mesh, end, opts = {}) {
  const hops = opts.hops ?? 4
  const dur = opts.durMs ?? 160
  const endV = new THREE.Vector3(end.x, end.y, end.z)
  const start = mesh.position.clone()

  for (let h = 0; h < hops; h++) {
    const t = (h + 1) / hops
    const isLast = h === hops - 1
    let wp = isLast ? endV : start.clone().lerp(endV, t)
    
    // 마지막 홉이 아니면 약간의 랜덤 지터
    if (!isLast) {
      const seed = (opts.seed || 0) + h
      const ju = (Math.sin(seed * 12.9898) * 43758.5453) % 1
      const jv = (Math.cos(seed * 78.233) * 43758.5453) % 1
      wp.x += ju * 1.5
      wp.z += jv * 1.2
    }
    
    await tweenJump(mesh, wp, dur, 0.4 + (h % 2) * 0.2)
  }
}

/** @param {THREE.Object3D} obj */
export function tweenWorldPos(obj, end, durMs, easeFn = quadOut) {
  const start = obj.position.clone()
  const dest = end
  const t0 = performance.now()
  return new Promise((resolve) => {
    function frame(now) {
      const k = easeFn(Math.min(1, (now - t0) / durMs))
      obj.position.x = THREE.MathUtils.lerp(start.x, dest.x, k)
      obj.position.y = THREE.MathUtils.lerp(start.y, dest.y, k)
      obj.position.z = THREE.MathUtils.lerp(start.z, dest.z, k)
      if (k >= 1) resolve()
      else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

export function tweenCameraShake(cam, amp, twists, durMs = 380) {
  const basePos = cam.position.clone()
  const look = new THREE.Vector3(TOP_VIEW_LOOK_AT.x, CAMERA_LOOK_Y, TOP_VIEW_LOOK_AT.z)
  const t0 = performance.now()
  return new Promise((resolve) => {
    function frame(now) {
      const k = Math.min(1, (now - t0) / durMs)
      cam.position.x = basePos.x + amp * Math.sin(k * twists * Math.PI * 2)
      cam.position.y = basePos.y + amp * 0.42 * Math.cos(k * twists * Math.PI * 2)
      cam.lookAt(look.x, look.y, look.z)
      if (k >= 1) {
        cam.position.copy(basePos)
        cam.lookAt(look.x, look.y, look.z)
        resolve()
      } else requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  })
}

function quadOut(t) {
  return 1 - (1 - t) * (1 - t)
}

/** 탈락 연출: X(화면 좌우)축 넓게, Z(깊이)는 거의 두지 않아 실패가 옆으로 쫙 퍼진 느낌 */
export function xzScatterDelta(botIndex, slot) {
  const u =
    ((((botIndex + 911) >>> 3) ^ (slot * 17489) ^ (botIndex * 31337)) >>> 0) % 9973 / 9973
  const v = ((((botIndex * 7919 + slot * 793) >>> 0) ^ 9277)) % 9833 / 9833
  const xWide = (-14 + u * 28) * 1.1
  const zTight = (v - 0.5) * 5.2
  return new THREE.Vector3(xWide, -0.2 - v * 0.3, zTight * 0.35)
}
