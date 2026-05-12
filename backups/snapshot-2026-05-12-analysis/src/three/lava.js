import * as THREE from 'three'

/**
 * 용암 대신 하얀 종이 질감 위에 단순한 물결 스케치 (바다 느낌)
 */
export function createLavaPlane() {
  const cnv = document.createElement('canvas')
  cnv.width = 256
  cnv.height = 256
  const ctx = cnv.getContext('2d')
  if (ctx) {
    // 배경: 흰색 (스케치 종이 느낌)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, 256, 256)

    // 물결 스케치 (연한 회색 선)
    ctx.strokeStyle = '#dddddd'
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    for (let i = 0; i < 8; i++) {
      const y = 20 + i * 32
      const xOff = (i % 2) * 30
      ctx.beginPath()
      ctx.moveTo(xOff, y)
      ctx.quadraticCurveTo(xOff + 40, y - 15, xOff + 80, y)
      ctx.quadraticCurveTo(xOff + 120, y + 15, xOff + 160, y)
      ctx.quadraticCurveTo(xOff + 200, y - 15, xOff + 240, y)
      ctx.stroke()
    }
  }

  const tex = new THREE.CanvasTexture(cnv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(10, 10)

  const geo = new THREE.PlaneGeometry(160, 160)
  const mat = new THREE.MeshBasicMaterial({ map: tex })

  const mesh = new THREE.Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(0, -6.8, -6)
  mesh.name = 'lq-sea-sketch'
  return mesh
}
