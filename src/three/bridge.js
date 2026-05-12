import * as THREE from 'three'
import { MARKER_Z_BIAS, zigXForTier, zForClears } from './players.js'

/** 7-step 지그재그 돌다리 + 보물 — `zForClears`·`zigXForTier`와 맞춤 */
export function createBridgeMeshes() {
  const group = new THREE.Group()
  group.name = 'lq-bridge'

  const stoneMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 12, specular: 0x2a2a2a })
  const stoneDarkMat = new THREE.MeshPhongMaterial({ color: 0x050505, shininess: 6, specular: 0x1a1a1a })
  const chestSideMat = new THREE.MeshPhongMaterial({ color: 0x4a3728, shininess: 10 })
  const goldMat = new THREE.MeshPhongMaterial({ color: 0xd4a017, shininess: 52, specular: 0xffe8aa })

  /** @type {THREE.Mesh[]} */
  const steps = []
  for (let i = 0; i < 7; i++) {
    const zx = zigXForTier(i)
    const zz = zForClears(i) + MARKER_Z_BIAS
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.65, 0.42, 20), stoneMat)
    cyl.receiveShadow = true
    cyl.position.set(zx, -6.05, zz)
    cyl.name = `lq-step-${i}`
    group.add(cyl)
    steps.push(cyl)

    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.07, 8, 32), stoneDarkMat)
    ring.rotation.x = Math.PI / 2
    ring.position.copy(cyl.position)
    ring.position.y += 0.2
    group.add(ring)
  }

  const islandZ = zForClears(7) + MARKER_Z_BIAS
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
