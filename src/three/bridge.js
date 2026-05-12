import * as THREE from 'three'
import { MARKER_Z_BIAS, zigXForTier, zForClears } from './players.js'

/** 7-step 지그재그 돌다리 + 보물 — `zForClears`·`zigXForTier`와 맞춤 */
export function createBridgeMeshes() {
  const group = new THREE.Group()
  group.name = 'lq-bridge'

  const stoneMat = new THREE.MeshPhongMaterial({ 
    color: 0x1a0a05, 
    shininess: 30, 
    specular: 0x331100,
    emissive: 0x220a00
  })
  const stoneGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 })
  const chestSideMat = new THREE.MeshPhongMaterial({ color: 0x4a3728, shininess: 10 })
  const goldMat = new THREE.MeshPhongMaterial({ 
    color: 0xffcc00, 
    shininess: 100, 
    specular: 0xffffff,
    emissive: 0x442200
  })

  /** @type {THREE.Mesh[]} */
  const steps = []
  for (let i = 0; i < 7; i++) {
    const zx = zigXForTier(i)
    const zz = zForClears(i) + MARKER_Z_BIAS
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.6, 24), stoneMat)
    cyl.receiveShadow = true
    cyl.position.set(zx, -6.1, zz)
    cyl.name = `lq-step-${i}`
    group.add(cyl)
    steps.push(cyl)

    // 마그마 글로우 링
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.08, 8, 32), stoneGlowMat)
    ring.rotation.x = Math.PI / 2
    ring.position.copy(cyl.position)
    ring.position.y += 0.35
    group.add(ring)
  }

  const islandZ = zForClears(7.8) + MARKER_Z_BIAS // 겹침 방지를 위해 7.8로 상향 조정 💋
  const island = new THREE.Mesh(new THREE.BoxGeometry(13, 1.55, 10.5), goldMat)
  island.position.set(0.15, -5.55, islandZ)
  island.name = 'lq-treasure-island'
  group.add(island)

  for (let j = -1; j <= 1; j++) {
    const chestMat = j === 0 ? goldMat : chestSideMat
    const chest = new THREE.Mesh(new THREE.BoxGeometry(2.35, 2.05, 1.75), chestMat)
    chest.position.set(j * 2.35, -4.4, islandZ - 0.45 + Math.abs(j) * 0.18)
    group.add(chest)
  }

  return { group, steps, island }
}
