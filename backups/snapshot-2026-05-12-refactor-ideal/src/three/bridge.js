import * as THREE from 'three'
import { PLAYER_START_Z, STEP_Z_DELTA } from './players.js'

/** 7-step bridge + treasure platform aligned with GAME Z spacing */
export function createBridgeMeshes() {
  const group = new THREE.Group()
  group.name = 'lq-bridge'

  const stoneMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0a, shininess: 8 })
  const stoneDarkMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 4 })
  const goldMat = new THREE.MeshPhongMaterial({ color: 0xd4a017, shininess: 32 })
  const paperMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 2 })

  // 1. 시작 광장 (100인이 서 있는 네모칸)
  const startDeck = new THREE.Mesh(new THREE.BoxGeometry(15, 0.45, 12), paperMat)
  startDeck.position.set(0, -6.1, PLAYER_START_Z + 3.5)
  startDeck.name = 'lq-start-deck'
  group.add(startDeck)

  // 시작 데크 테두리
  const deckRing = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.5, 12.2), stoneDarkMat)
  deckRing.position.copy(startDeck.position)
  deckRing.position.y -= 0.1
  group.add(deckRing)

  const stepZStart = PLAYER_START_Z + STEP_Z_DELTA
  const stepSpacing = STEP_Z_DELTA

  /** @type {THREE.Group[]} */
  const steps = []
  const stepR = 2.4 // 사이즈 키움 💋
  for (let i = 0; i < 7; i++) {
    const stepGroup = new THREE.Group()
    stepGroup.position.set(0, -6.05, stepZStart + i * stepSpacing)
    stepGroup.name = `lq-step-group-${i}`

    // 하단 그림자 (돌계단 느낌 🔞💋)
    const shadow = new THREE.Mesh(
      new THREE.CylinderGeometry(stepR + 0.1, stepR + 0.1, 0.4, 32),
      stoneDarkMat
    )
    shadow.position.y = -0.1
    stepGroup.add(shadow)

    // 상단 흰색 원 (스케치 느낌)
    const cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(stepR, stepR, 0.35, 32),
      paperMat
    )
    cyl.name = `lq-step-mesh-${i}`
    stepGroup.add(cyl)

    group.add(stepGroup)
    steps.push(stepGroup) // 그룹 전체를 넣어서 나중에 같이 움직이게 함
  }

  // 2. 보물섬 (사이즈 줄이고 스케치 느낌)
  const island = new THREE.Mesh(new THREE.BoxGeometry(8.5, 1.25, 7.5), paperMat)
  island.position.set(0, -5.75, -45) // 더 뒤로 밀어서 겹침 방지
  island.name = 'lq-treasure-island'
  group.add(island)

  // 보물섬 테두리
  const islandRing = new THREE.Mesh(new THREE.BoxGeometry(8.7, 1.35, 7.7), stoneDarkMat)
  islandRing.position.copy(island.position)
  islandRing.position.y -= 0.1
  group.add(islandRing)

  /** 금화 더미 (실루엣 확대용) */
  const coinPileMat = new THREE.MeshPhongMaterial({ color: 0xffdf40, shininess: 90, specular: 0xffffff })
  const pile = new THREE.Mesh(new THREE.SphereGeometry(2.2, 20, 16), coinPileMat)
  pile.scale.set(1, 0.55, 1.08)
  pile.position.set(0.1, -4.95, -44.85)
  group.add(pile)

  for (let j = -1; j <= 1; j++) {
    const chestMat = j === 0 ? goldMat : stoneDarkMat
    const chest = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.85, 1.55), chestMat)
    chest.position.set(j * 2.2, -4.85, -34.45 + Math.abs(j) * 0.18)
    group.add(chest)
  }

  return { group, steps, island }
}
