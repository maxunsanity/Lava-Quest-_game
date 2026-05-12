import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'
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
  tweenFleaHops,
  tweenWorldPos,
  worldUnitsPerPixel,
  xzScatterDelta,
} from './three/players.js'

function easeInQuad(t) {
  return t * t
}

function quadOut(t) {
  return 1 - (1 - t) * (1 - t)
}

const WORLD_BASE_Y = 2.85
const LOOK_DECK_LOCAL = 5.86

/**
 * @param {HTMLElement} containerEl
 * @param {Record<string, string>[]} bots
 * @param {Iterable<number>} aliveSetInitial
 * @param {{ fleaIntro?: boolean, playerClears?: number }} [opts]
 */
export function mountLavaScene(containerEl, bots, aliveSetInitial, opts = {}) {
  const rect = containerEl.getBoundingClientRect()
  const bridgePxLift = bridgeLiftWorldForPixels(containerEl, 150, LAVA_FRUSTUM_HALF_H)
  const worldRootY = WORLD_BASE_Y + bridgePxLift
  const lookWorld = new THREE.Vector3(TOP_VIEW_LOOK_AT.x, worldRootY - LOOK_DECK_LOCAL, TOP_VIEW_LOOK_AT.z)
  syncCameraLookYWorld(lookWorld.y)

  const ctx = createLavaTopViewBasics(containerEl, {
    lookWorld,
    cameraLiftY: 86,
    frustumHalfH: LAVA_FRUSTUM_HALF_H,
    bottomTrim: 5.5,
    width: rect.width,
    height: rect.height
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
  const hPx = Math.max(1, rect.height)
  const wpp = worldUnitsPerPixel(cam, hPx)
  /** 오빠, 유저 사이즈를 2/3로 다시 줄였어! (1번 해결) 🔞💋 */
  const markerWorldR = wpp * 9.33

  const sprites = createPlayerSprites(worldRoot, bots, markerWorldR)
  /** @type {Set<number>} */
  const alive = new Set(aliveSetInitial)
  /** @type {Set<number>} */
  const frozenOnField = new Set()

  let playerClears = Number.isFinite(opts?.playerClears)
    ? /** @type {number} */ (opts.playerClears)
    : 0

  let rafId = null

  function tick(time) {
    TWEEN.update(time) // 트윈 업데이트 추가! 🔞💋
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
    fleaIntroPromise = (async () => {
      const targets = computeClusterTargets(alive, playerClears, bots)
      const sortedAlive = [...alive].sort((a, b) => a - b)
      const tasks = sortedAlive.map((idx) => {
        const mesh = sprites[idx]
        const t = targets[idx]
        if (!t || !mesh) return Promise.resolve()
        const stagger = (idx * 53 + (idx >>> 2) * 17) % 260
        return delay(stagger).then(() =>
          tweenFleaHops(mesh, t, { hops: 4, durMs: 140, seed: idx * 997 + 13 }),
        )
      })
      await Promise.all(tasks)
      syncVisual()
    })()
  } else {
    syncVisual()
  }

  async function playClearSuccessAnimation(elimIndicesRaw, clearsAfter) {
    const eliminate = [...new Set(elimIndicesRaw.map((ix) => Number(ix)))]
      .filter((ix) => Number.isFinite(ix) && ix > 0 && alive.has(ix))

    // 1단계: 사방으로 넓게 확산
    const scatterTweens = eliminate.map((botIndex, slot) => {
      const mesh = sprites[botIndex]
      const delta = xzScatterDelta(botIndex, slot)
      const dest = mesh.position.clone().add(delta)
      return tweenWorldPos(mesh, dest, 650, quadOut)
    })
    await Promise.all(scatterTweens)

    // 2단계: 수면 아래로 가라앉기
    const sinkTweens = eliminate.map((idx) => {
      const mesh = sprites[idx]
      return tweenWorldPos(mesh, {
        x: mesh.position.x,
        y: mesh.position.y - 12.0,
        z: mesh.position.z
      }, 1200, easeInQuad)
    })
    await Promise.all(sinkTweens)

    for (const idx of eliminate) {
      alive.delete(idx)
      frozenOnField.add(idx)
      sprites[idx].visible = false
    }

    playerClears = clearsAfter
    const survivors = [...alive].sort((a, b) => (a === 0 ? -1 : b === 0 ? 1 : a - b))
    const targets = computeClusterTargets(alive, clearsAfter, bots)
    const waves = survivorWaves(survivors)

    // 3단계: 생존자들은 벼룩처럼 튀어서 이동!
    for (const wave of waves) {
      if (wave.length === 0) continue
      const tw = wave.map((ix) => {
        const t = targets[ix]
        const mesh = sprites[ix]
        if (!t || !mesh) return Promise.resolve()
        return import('./three/players.js').then(m => m.tweenJump(mesh, t, 600, 1.4))
      })
      await Promise.all(tw)
      
      // 착지하는 순간 돌계단 눌림 효과! (4번 해결) 🔞💋
      const stepIdx = clearsAfter - 1
      const targetStep = bridge.steps[stepIdx]
      if (targetStep) {
        const origY = targetStep.position.y
        new TWEEN.Tween(targetStep.position)
          .to({ y: origY - 0.25 }, 100)
          .easing(TWEEN.Easing.Quadratic.Out)
          .chain(
            new TWEEN.Tween(targetStep.position)
              .to({ y: origY }, 150)
              .easing(TWEEN.Easing.Quadratic.In)
          )
          .start()
      }
      await delay(150)
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
        tweenCameraShake(ctx.camera, 0.74, 3, 360),
        tweenWorldPos(me, {
          x: me.position.x + 1.1,
          y: me.position.y - 9.35,
          z: me.position.z - 3.6,
        }, 1480, easeInQuad),
      ])
      me.visible = false
      alive.delete(0)
      syncVisual()
    },
    getAliveClone: () => new Set(alive),
    disposeScene() {
      cancelAnimationFrame(rafId)
      try { ctx.dispose() } catch {}
    },
  }
}
