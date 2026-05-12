import * as THREE from 'three'
import { delay } from './simulation.js'
import { createLavaTopViewBasics } from './three/setup.js'
import { createLavaPlane } from './three/lava.js'
import { createBridgeMeshes } from './three/bridge.js'
import { createArenaMapDecor } from './three/arenaMap.js'
import {
  bridgeLiftWorldForPixels,
  computeClusterTargets,
  createPlayerSprites,
  layoutAliveCluster,
  layoutLavaScatter,
  LAVA_FRUSTUM_HALF_H,
  survivorWaves,
  syncCameraLookYWorld,
  TOP_VIEW_LOOK_AT,
  tweenCameraShake,
  tweenCameraZoom,
  tweenFleaHops,
  tweenWorldPos,
  worldUnitsPerPixel,
  xzScatterDelta,
  createDustBurst,
} from './three/players.js'

/** 연출 가속: 1=기본, 작을수록 빠름 (트윈·대기 간격 공통) */
const PACE = 0.52
const paceMs = (n) => Math.max(12, Math.round(n * PACE))

function easeInQuad(t) {
  return t * t
}

function easeOutCubic(t) {
  const p = Math.min(1, Math.max(0, t))
  return 1 - (1 - p) ** 3
}

function quadOut(t) {
  return 1 - (1 - t) * (1 - t)
}

const WORLD_BASE_Y = 2.85
const LOOK_DECK_LOCAL = 5.86

/** 캔버스 세로 기준 시야를 위로 올리는 양(px). 값을 줄이면 시야가 아래로(화면 기준 하단/경로 앞쪽) 내려간다. */
const FRAMING_SHIFT_UP_PX = 0

/**
 * @param {HTMLElement} containerEl
 * @param {Record<string, string>[]} bots
 * @param {Iterable<number>} aliveSetInitial
 * @param {{ fleaIntro?: boolean, playerClears?: number }} [opts]
 *   `playerClears`: 완료한 돌계단 수(0=첫 돌·게임 시작). 로비/실패연출/클리어 직전 스냅샷과 동일 값을 넘겨야 첫 프레임부터 위치가 맞음.
 */
export function mountLavaScene(containerEl, bots, aliveSetInitial, opts = {}) {
  const bridgePxLift = bridgeLiftWorldForPixels(containerEl, 150, LAVA_FRUSTUM_HALF_H)
  const worldRootY = WORLD_BASE_Y + bridgePxLift
  const framingZ = bridgeLiftWorldForPixels(containerEl, FRAMING_SHIFT_UP_PX, LAVA_FRUSTUM_HALF_H)
  const lookWorld = new THREE.Vector3(
    TOP_VIEW_LOOK_AT.x,
    worldRootY - LOOK_DECK_LOCAL,
    TOP_VIEW_LOOK_AT.z - framingZ,
  )
  syncCameraLookYWorld(lookWorld.y)

  const ctx = createLavaTopViewBasics(containerEl, {
    lookWorld,
    // 탑뷰: 값을 내리면 카메라가 시선점에 더 가까워져(낮아져) 전장 프레이밍이 살짝 달라짐
    cameraLiftY: 72,
    frustumHalfH: LAVA_FRUSTUM_HALF_H,
    bottomTrim: 0, // 하단 잘림 방지 💋
  })

  const worldRoot = new THREE.Group()
  worldRoot.name = 'lq-world-root'
  worldRoot.position.y = worldRootY
  ctx.scene.add(worldRoot)

  const lava = createLavaPlane()
  worldRoot.add(lava)
  const bridge = createBridgeMeshes()
  worldRoot.add(bridge.group)

  worldRoot.traverse((o) => {
    if (o.isMesh) o.renderOrder = 0
  })

  worldRoot.add(createArenaMapDecor())

  const cam = ctx.camera
  const hPx = Math.max(1, ctx.renderer.domElement.height)
  const wpp = worldUnitsPerPixel(cam, hPx)
  /** 세로 기준 디스크 지름(봇) — 키우면 생존/탈락 이동 연출이 더 잘 보임 */
  const markerWorldR = wpp * 3.85

  const sprites = createPlayerSprites(worldRoot, bots, markerWorldR)
  /** @type {Set<number>} */
  const alive = new Set(aliveSetInitial)
  /** @type {Set<number>} 탈락 연출 후 필드에 남겨두는 회색 원 */
  const frozenOnField = new Set()

  let playerClears = Number.isFinite(opts?.playerClears)
    ? /** @type {number} */ (opts.playerClears)
    : 0

  let rafId = null

  function tick() {
    ctx.renderer.render(ctx.scene, ctx.camera)
    rafId = requestAnimationFrame(tick)
  }
  tick()

  function syncVisual() {
    layoutAliveCluster(sprites, alive, playerClears, bots)
    for (let i = 0; i < sprites.length; i++) {
      if (alive.has(i)) continue
      sprites[i].visible = frozenOnField.has(i)
    }
  }

  let fleaIntroPromise = Promise.resolve()
  if (opts?.fleaIntro) {
    layoutLavaScatter(sprites, alive)
    for (let i = 0; i < sprites.length; i++) {
      if (alive.has(i)) continue
      sprites[i].visible = frozenOnField.has(i)
    }
    fleaIntroPromise = (async () => {
      const targets = computeClusterTargets(alive, playerClears, bots)
      const sortedAlive = [...alive].sort((a, b) => a - b)
      const tasks = sortedAlive.map((idx) => {
        const mesh = sprites[idx]
        const t = targets[idx]
        if (!t || !mesh) return Promise.resolve()
        const stagger = Math.floor(((idx * 53 + (idx >>> 2) * 17) % 260) * PACE)
        return delay(stagger).then(() =>
          tweenFleaHops(mesh, t, { hops: 4, durMs: paceMs(142), seed: idx * 997 + 13 }),
        )
      })
      await Promise.all(tasks)
      syncVisual()
    })()
  } else {
    syncVisual()
  }

  /**
   * 클리어 성공: 플레이어 선행(클리어+1 칸) → CSV delay_ms 순 탈락 연출 → 생존자 파동 재배치
   * 호출 전 장면의 playerClears는 clearsAfter-1 이어야 한다.
   * @param {{ idx: number, delay_ms: number }[]} elimPlan
   */
  async function playClearSuccessAnimation(elimPlan, clearsAfter) {
    const prevClears = Math.max(0, clearsAfter - 1)

    if (alive.has(0)) {
      const oldT = computeClusterTargets(alive, prevClears, bots)[0]
      const newT = computeClusterTargets(alive, clearsAfter, bots)[0]
      const mesh = sprites[0]
      if (oldT && newT && mesh) {
        mesh.position.set(oldT.x, oldT.y, oldT.z)
        // 다음 돌로 점프할 때 2배 줌인 (쉐이크 삭제 💋)
        await Promise.all([
          tweenWorldPos(mesh, { x: newT.x, y: newT.y, z: newT.z }, paceMs(450), quadOut),
          tweenCameraZoom(ctx.camera, 2.0, newT, paceMs(450), paceMs)
        ])
        createDustBurst(ctx.scene, newT)
        
        // 착지 후 줌인 상태 유지 (오빠의 요청대로 끝까지 밀착! 💋)
        await delay(paceMs(200))
        // 줌아웃 로직 삭제 완료 ❤️‍🔥
      }
    }

    playerClears = clearsAfter

    let prevScheduled = 0
    let elimSlot = 0
    const seenElim = new Set()
    for (const step of elimPlan) {
      const ix = Number(step.idx)
      if (!Number.isFinite(ix) || ix <= 0 || seenElim.has(ix)) continue
      if (!alive.has(ix)) continue
      seenElim.add(ix)

      const d = Math.max(0, Number(step.delay_ms) || 0)
      const waitMs = Math.max(0, Math.floor((d - prevScheduled) * PACE))
      prevScheduled = d
      await delay(waitMs)

      const mesh = sprites[ix]
      const delta = xzScatterDelta(ix, elimSlot)
      elimSlot += 1
      const dest = mesh.position.clone().add(delta)
      await tweenWorldPos(mesh, dest, paceMs(480), easeOutCubic)

      alive.delete(ix)
      frozenOnField.add(ix)
      const mat = mesh.material
      if (mat && 'color' in mat) /** @type {THREE.MeshBasicMaterial} */ (mat).color.setHex(0x6a6a6a)
      mesh.visible = true
    }

    const survivors = [...alive].sort((a, b) => {
      if (a === 0 && b !== 0) return -1
      if (b === 0 && a !== 0) return 1
      return a - b
    })
    const targets = computeClusterTargets(alive, clearsAfter, bots)
    const waves = survivorWaves(survivors)

    for (const wave of waves) {
      if (wave.length === 0) continue
      const tw = wave.map((ix) => {
        const t = targets[ix]
        const mesh = sprites[ix]
        if (!t || !mesh) return Promise.resolve()
        return tweenWorldPos(mesh, { x: t.x, y: t.y, z: t.z }, paceMs(360), quadOut)
      })
      await Promise.all(tw)
      await delay(paceMs(150))
    }

    syncVisual()
  }

  return {
    fleaIntroPromise,

    getPlayerClears: () => playerClears,

    updatePlayerClears(clears) {
      playerClears = clears
      syncVisual()
    },

    repositionAll(aliveIndexes, clears) {
      alive.clear()
      frozenOnField.clear()
      for (const n of aliveIndexes) alive.add(n)
      playerClears = clears
      syncVisual()
    },

    playClearSuccessAnimation,

    async animateSelfEliminate(domFlashOptional) {
      if (!alive.has(0)) return

      domFlashOptional?.()

      const me = sprites[0]
      await Promise.all([
        tweenWorldPos(me, {
          x: me.position.x + 1.1,
          y: me.position.y - 9.35,
          z: me.position.z - 3.6,
        }, paceMs(900), easeInQuad),
      ])

      me.visible = false
      alive.delete(0)

      syncVisual()
    },

    getAliveClone() {
      return new Set(alive)
    },

    disposeScene() {
      cancelAnimationFrame(rafId)
      try {
        ctx.dispose()
      } catch {}
    },
  }
}
