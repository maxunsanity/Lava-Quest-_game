import * as THREE from 'three'
import { MARKER_Z_BIAS, zigXForTier, zForClears } from './players.js'

const STEP_COUNT = 7

const FIELD_HALF = 43.8
const FIELD_Z_CENTER = -6

const LINE_Y = -5.64

/** 시작·대기 느낌 (플레이어 클러스터 Z 근처) */
const START_X_HALF = 40
const START_Z_NEAR = -3
const START_Z_FAR = 38

const GOAL_X_HALF = 9
const GOAL_Z_NEAR = -32
const GOAL_Z_FAR = -23

/** @param {number[]} out @param {THREE.Vector3[]} pts */
function pushLinePts(out, pts) {
  for (let i = 1; i < pts.length; i++) {
    out.push(pts[i - 1].x, pts[i - 1].y, pts[i - 1].z, pts[i].x, pts[i].y, pts[i].z)
  }
}

/**
 * 시작 구역·전장 외곽·돌줄 안내 라인 탑뷰 오버레이
 */
export function createArenaMapDecor() {
  const root = new THREE.Group()
  root.name = 'lq-arena-map'

  const bright = new THREE.LineBasicMaterial({
    color: 0xfff7d4,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    depthTest: true,
  })
  const dim = bright.clone()
  dim.opacity = 0.42
  dim.color.setHex(0xfff1e8)

  const zb = FIELD_Z_CENTER - FIELD_HALF
  const zt = FIELD_Z_CENTER + FIELD_HALF
  const border = [
    new THREE.Vector3(-FIELD_HALF, LINE_Y, zb),
    new THREE.Vector3(FIELD_HALF, LINE_Y, zb),
    new THREE.Vector3(FIELD_HALF, LINE_Y, zt),
    new THREE.Vector3(-FIELD_HALF, LINE_Y, zt),
    new THREE.Vector3(-FIELD_HALF, LINE_Y, zb),
  ]
  const borderFlat = /** @type {number[]} */ ([])
  pushLinePts(borderFlat, border)
  const gBorder = new THREE.BufferGeometry()
  gBorder.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(borderFlat), 3))
  const borderLine = new THREE.LineSegments(gBorder, dim)
  borderLine.renderOrder = -3
  root.add(borderLine)

  const zs0 = START_Z_NEAR + MARKER_Z_BIAS
  const zs1 = START_Z_FAR + MARKER_Z_BIAS
  const sx = START_X_HALF
  const startR = [
    new THREE.Vector3(-sx, LINE_Y, zs0),
    new THREE.Vector3(sx, LINE_Y, zs0),
    new THREE.Vector3(sx, LINE_Y, zs1),
    new THREE.Vector3(-sx, LINE_Y, zs1),
    new THREE.Vector3(-sx, LINE_Y, zs0),
  ]
  const startFlat = /** @type {number[]} */ ([])
  pushLinePts(startFlat, startR)
  const gStart = new THREE.BufferGeometry()
  gStart.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(startFlat), 3))
  const startLine = new THREE.LineSegments(gStart, bright.clone())
  startLine.material.color.setHex(0xa7f3d0)
  startLine.renderOrder = -2
  root.add(startLine)

  const stripW = START_X_HALF * 2 + 2
  const stripD = zs1 - zs0 + 1.4
  const startPad = new THREE.Mesh(
    new THREE.PlaneGeometry(stripW, stripD),
    new THREE.MeshBasicMaterial({
      color: 0x1d9a62,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
    }),
  )
  startPad.rotation.x = -Math.PI / 2
  startPad.position.set(0, LINE_Y + 0.026, (zs0 + zs1) * 0.5)
  startPad.renderOrder = -25
  root.add(startPad)

  const gx = GOAL_X_HALF
  const gz0 = GOAL_Z_NEAR + MARKER_Z_BIAS
  const gz1 = GOAL_Z_FAR + MARKER_Z_BIAS
  const goalR = [
    new THREE.Vector3(-gx, LINE_Y, gz0),
    new THREE.Vector3(gx, LINE_Y, gz0),
    new THREE.Vector3(gx, LINE_Y, gz1),
    new THREE.Vector3(-gx, LINE_Y, gz1),
    new THREE.Vector3(-gx, LINE_Y, gz0),
  ]
  const goalFlat = /** @type {number[]} */ ([])
  pushLinePts(goalFlat, goalR)
  const gGoal = new THREE.BufferGeometry()
  gGoal.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(goalFlat), 3))
  const goalLine = new THREE.LineSegments(gGoal, bright.clone())
  goalLine.material.opacity = 0.52
  goalLine.material.color.setHex(0xffe8aa)
  goalLine.renderOrder = -3
  root.add(goalLine)

  const spine = []
  for (let i = 0; i < STEP_COUNT; i++) {
    const zz = zForClears(i) + MARKER_Z_BIAS
    spine.push(new THREE.Vector3(zigXForTier(i), LINE_Y, zz))
  }
  spine.push(new THREE.Vector3(zigXForTier(7), LINE_Y, zForClears(7) + MARKER_Z_BIAS))
  const spineFlat = /** @type {number[]} */ ([])
  pushLinePts(spineFlat, spine)
  const gSpine = new THREE.BufferGeometry()
  gSpine.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(spineFlat), 3))
  const spineLine = new THREE.LineSegments(gSpine, bright.clone())
  spineLine.material.color.setHex(0xffefc2)
  spineLine.material.opacity = 0.94
  spineLine.renderOrder = -2
  root.add(spineLine)

  return root
}
