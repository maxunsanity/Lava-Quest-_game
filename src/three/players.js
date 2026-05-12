import * as THREE from 'three'

export const PLAYER_START_Z = 20
export const STEP_Z_DELTA = -6.5
/** 오쏘 탑뷰 세로 반절경 — 32로 상향하여 아래쪽 돌계단까지 전체 시야 확보! 💋 */
export const LAVA_FRUSTUM_HALF_H = 32

export const TOP_VIEW_LOOK_AT = Object.freeze({ x: 0, y: -3.03, z: -4 }) // 상하 밸런스를 위해 -4로 확정! 💋

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

/** 게임 `clearsCompleted`와 동일: 완료한 돌 단계 수 → 브릿지 상 z·지그재그 티어 */
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
  return { dx: Math.cos(ang) * 1.45, dz: Math.sin(ang) * 0.28 }
}

function markerMaterial(isMe) {
  return new THREE.MeshBasicMaterial({
    color: isMe ? 0x00ffff : 0xffffff,
    depthTest: false, // 다른 유닛과 높이 비교 차단 💋
    depthWrite: false,
    transparent: false
  })
}

function outlineMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x000000,
    depthTest: false, // 테두리도 비교 차단 💋
    depthWrite: false,
    transparent: false
  })
}

/**
 * @returns {THREE.Mesh[]}
 */
export function createPlayerSprites(scene, bots, markerRadiusWorld = 0.06) {
  const meshes = []
  const segments = 48 // 16에서 48로 늘려서 매끄러운 원으로! 💋
  for (let i = 0; i < bots.length; i++) {
    const group = new THREE.Group()
    group.name = `lq-p-group-${i}`
    // 유닛들끼리 겹칠 때 지저분한 무늬(Z-fighting) 안 생기게 서열 정리 🔞
    group.position.y = i * 0.001 

    // 외곽선 (색상이 더 꽉 차 보이게 아주 얇게 💋)
    const outGeo = new THREE.CircleGeometry(markerRadiusWorld * 1.1, segments)
    const outline = new THREE.Mesh(outGeo, outlineMaterial())
    outline.position.y = -0.005
    outline.renderOrder = i * 10 + 10 // 개별 렌더링 순서 부여 🔞
    group.add(outline)

    // 본체
    const r = i === 0 ? markerRadiusWorld * 1.1 : markerRadiusWorld
    const geo = new THREE.CircleGeometry(r, segments)
    const mesh = new THREE.Mesh(geo, markerMaterial(i === 0))
    mesh.renderOrder = i * 10 + 11 // 본체는 테두리보다 살짝 위에 🔞
    group.add(mesh)

    // 내 유닛용 글로우 오라 (강렬한 사이언 💋)
    if (i === 0) {
      const glowGeo = new THREE.CircleGeometry(markerRadiusWorld * 2.2, segments)
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0x00ffff, 
        transparent: true, 
        opacity: 0.5,
        depthTest: false,
        depthWrite: false
      })
      const glow = new THREE.Mesh(glowGeo, glowMat)
      glow.position.y = -0.02
      group.add(glow)
    }

    group.rotation.x = -Math.PI / 2
    group.renderOrder = i === 0 ? 32000 : 18000 + i * 2
    group.visible = false
    scene.add(group)
    meshes.push(group)
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
  /** @type {Record<number,{x:number,y:number,z:number}>} */
  const out = {}

  const DECK_Y = -5.74

  const aliveSorted = [...aliveSet].sort((a, b) => {
    if (a === 0 && b !== 0) return -1
    if (b === 0 && a !== 0) return 1
    return a - b
  })

  aliveSorted.forEach((idx, slot) => {
    /* 동시 게임: 생존자 전원 같은 티어 = 완료한 돌 개수(playerClears) */
    const tier = THREE.MathUtils.clamp(playerClears, 0, 7)
    const cz = zForClears(tier) + MARKER_Z_BIAS
    const zx = zigXForTier(tier)

    // 2열 배치 로직: slot을 기준으로 앞줄(0), 뒷줄(1) 결정 🔞
    const row = slot % 2
    const isFront = row === 0
    const col = Math.floor(slot / 2)
    
    // 가로 배치: 중앙에서부터 양옆으로 촘촘하게 💋
    const xSpacing = 0.24 // 0.32에서 0.24로 줄임
    const colLimit = 15 // 한 줄에 더 많이 빽빽하게 💋
    const xOff = (col % colLimit - (colLimit - 1) * 0.5) * xSpacing
    
    // 앞뒤 간격(Z) 초밀착 부여 ❤️‍🔥
    const rowZ = isFront ? 0.24 : -0.24 // 0.75에서 0.24로 대폭 축소!
    const jitterX = (idx * 137 % 100) / 1000 - 0.05 

    out[idx] = {
      x: zx + xOff + jitterX + (idx === 0 ? 0.1 : 0),
      y: DECK_Y + (idx === 0 ? 0.05 : 0), 
      z: cz + rowZ,
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
    const x = -8.2 + u * 16.4
    const z = 6.8 + v * 11.5 + MARKER_Z_BIAS
    mesh.position.set(x, LAVA_SCATTER_DECK_Y + 0.05, z)
    mesh.rotation.x = -Math.PI / 2
    mesh.visible = true
  }
}

/** 짧은 구간을 여러 번 튀기듯 이동해 목표에 착지 */
export async function tweenFleaHops(mesh, end, opts = {}) {
  const hops = opts.hops ?? 5
  const dur = opts.durMs ?? 150
  const easeFn = opts.ease ?? quadOut
  const seed = opts.seed ?? 0
  const endV = new THREE.Vector3(end.x, end.y, end.z)
  const start = mesh.position.clone()

  for (let h = 0; h < hops; h++) {
    const isLast = h === hops - 1
    let wp
    if (isLast) {
      wp = endV
    } else {
      const t = (h + 1) / hops
      const ju = (((seed + h * 911) * 2654435761) >>> 0) % 1000 / 1000 - 0.5
      const jv = (((seed + h * 337) * 1597334677) >>> 0) % 1000 / 1000 - 0.5
      wp = start.clone().lerp(endV, t).add(new THREE.Vector3(ju * 2.9, 0, jv * 2.1))
      wp.y += 0.15 + (h % 3) * 0.04
    }
    await tweenWorldPos(mesh, { x: wp.x, y: wp.y, z: wp.z }, dur + h * 9, easeFn)
    // 씬에 직접 추가하기 위해 mesh의 부모(worldRoot)를 통해 접근하거나 
    // 여기서는 간단히 mesh.parent가 scene이라고 가정 (createPlayerSprites에서 추가됨)
    if (mesh.parent) createDustBurst(mesh.parent, wp)
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

/** 카메라 줌 & 위치 트윈 */
export function tweenCameraZoom(cam, targetZoom, targetLook, durMs, paceMsFn) {
  const startZoom = cam.zoom
  const startPos = cam.position.clone()
  const baseLook = new THREE.Vector3(TOP_VIEW_LOOK_AT.x, CAMERA_LOOK_Y, TOP_VIEW_LOOK_AT.z)
  const t0 = performance.now()
  
  return new Promise((resolve) => {
    function frame(now) {
      const k = Math.min(1, (now - t0) / durMs)
      const ease = 1 - (1 - k) * (1 - k) // quadOut
      
      cam.zoom = THREE.MathUtils.lerp(startZoom, targetZoom, ease)
      // 시점 이동 (아래로 살짝 굽어지는 곡선 연출 💋)
      const curLook = baseLook.clone().lerp(new THREE.Vector3(targetLook.x, CAMERA_LOOK_Y, targetLook.z), ease)
      
      // 아래로 살짝 휘어지는 효과 (Sin 곡선 추가 ❤️‍🔥)
      const curveDip = Math.sin(k * Math.PI) * 2.8 // 2.8만큼 아래로 휘어짐
      curLook.z += curveDip
      
      cam.position.x = THREE.MathUtils.lerp(startPos.x, curLook.x, ease)
      cam.position.z = THREE.MathUtils.lerp(startPos.z, curLook.z + 72, ease)
      
      cam.lookAt(curLook.x, CAMERA_LOOK_Y, curLook.z)
      cam.updateProjectionMatrix()
      
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
      // Y축(높이) 흔들림 제거하여 카메라가 아래로 가라앉는 느낌 방지
      cam.position.x = basePos.x + amp * Math.sin(k * twists * Math.PI * 2)
      cam.position.z = basePos.z + amp * 0.6 * Math.cos(k * twists * Math.PI * 2)
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

/** 착지 먼지 파티클 생성 */
export function createDustBurst(scene, pos) {
  const count = 8
  const group = new THREE.Group()
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  const geo = new THREE.PlaneGeometry(0.25, 0.25)
  
  for (let i = 0; i < count; i++) {
    const p = new THREE.Mesh(geo, mat.clone())
    p.position.set(pos.x, pos.y + 0.1, pos.z)
    p.rotation.x = -Math.PI / 2
    group.add(p)

    const angle = Math.random() * Math.PI * 2
    const dist = 0.5 + Math.random() * 0.8
    const tx = pos.x + Math.cos(angle) * dist
    const tz = pos.z + Math.sin(angle) * dist
    
    const t0 = performance.now()
    const dur = 400 + Math.random() * 300
    
    function animate() {
      const k = Math.min(1, (performance.now() - t0) / dur)
      p.position.x = THREE.MathUtils.lerp(pos.x, tx, k)
      p.position.z = THREE.MathUtils.lerp(pos.z, tz, k)
      p.material.opacity = 0.6 * (1 - k)
      p.scale.setScalar(1 - k * 0.5)
      if (k < 1) requestAnimationFrame(animate)
      else {
        group.remove(p)
        p.geometry.dispose()
        p.material.dispose()
      }
    }
    requestAnimationFrame(animate)
  }
  scene.add(group)
  setTimeout(() => scene.remove(group), 1000)
}

function quadOut(t) {
  return 1 - (1 - t) * (1 - t)
}

/** 탈락 연출: X(화면 좌우)축 넓게, Z(깊이)는 거의 두지 않아 실패가 옆으로 쫙 퍼진 느낌 */
export function xzScatterDelta(botIndex, slot) {
  const u =
    ((((botIndex + 911) >>> 3) ^ (slot * 17489) ^ (botIndex * 31337)) >>> 0) % 9973 / 9973
  const v = ((((botIndex * 7919 + slot * 793) >>> 0) ^ 9277)) % 9833 / 9833
  const xWide = (-12 + u * 24) * 1.05
  const zTight = (v - 0.5) * 4.8
  return new THREE.Vector3(xWide, -0.1 - v * 0.24, zTight * 0.32)
}
