import * as THREE from 'three'
import { disposeObject } from './dispose.js'

/**
 * Perspective scene + directional light suitable for lava quest path.
 */
export function createBasics(containerEl) {
  const scene = new THREE.Scene()

  const cam = new THREE.PerspectiveCamera(45, 1, 0.1, 200)
  cam.position.set(0, 10, 20)
  cam.lookAt(0, -1.5, -6)

  const amb = new THREE.AmbientLight(0xfff2e8, 0.55)
  const dir = new THREE.DirectionalLight(0xffffff, 1.05)
  dir.position.set(4, 18, 8)
  scene.add(amb)
  scene.add(dir)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  containerEl.innerHTML = ''
  containerEl.appendChild(renderer.domElement)

  const resize = () => {
    const r = containerEl.getBoundingClientRect()
    const w = Math.max(1, Math.floor(r.width))
    const h = Math.max(1, Math.floor(r.height))
    renderer.setSize(w, h, false)
    cam.aspect = w / h
    cam.updateProjectionMatrix()
  }
  resize()
  let ro = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize())
    ro.observe(containerEl)
  } else {
    window.addEventListener('resize', resize)
  }

  return { scene, camera: cam, renderer, dispose: () => {
    if (ro) ro.disconnect()
    else window.removeEventListener('resize', resize)
    disposeObject(scene)
    renderer.dispose()
    if (renderer.domElement.parentElement) renderer.domElement.remove()
  }}
}

/** 기획서 「위에서」 시점 — Orthographic 탑다운(+Y에서 수직 downward) */
export function createLavaTopViewBasics(containerEl, opts = {}) {
  /** @type {THREE.Vector3} */
  let lookWorld
  if (opts.lookWorld && opts.lookWorld.isVector3) lookWorld = opts.lookWorld.clone()
  else lookWorld = new THREE.Vector3(0, -2.95, -8)

  const cameraLiftY = typeof opts.cameraLiftY === 'number' ? opts.cameraLiftY : 72
  const frustumHalfH = typeof opts.frustumHalfH === 'number' ? opts.frustumHalfH : 26
  const bottomTrim = typeof opts.bottomTrim === 'number' ? opts.bottomTrim : 4

  const scene = new THREE.Scene()

  const amb = new THREE.AmbientLight(0xfff5ed, 0.9)
  const dir = new THREE.DirectionalLight(0xffffff, 0.52)
  dir.position.set(0.06, 1, -0.1).normalize()
  scene.add(amb, dir)

  const renderer = new THREE.WebGLRenderer({
    antialias: false,
    alpha: false,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.sortObjects = true
  renderer.domElement.style.display = 'block'
  renderer.domElement.style.width = '100%'
  renderer.domElement.style.height = '100%'

  containerEl.innerHTML = ''
  containerEl.appendChild(renderer.domElement)

  /** @type {THREE.OrthographicCamera} */
  let cam

  const resize = () => {
    const r = containerEl.getBoundingClientRect()
    const w = Math.max(1, Math.floor(r.width))
    const h = Math.max(1, Math.floor(r.height))
    renderer.setSize(w, h, false)
    const aspect = w / h
    const halfH = frustumHalfH
    const halfW = halfH * aspect
    const baseBottom = -halfH
    if (!cam) {
      cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, baseBottom + bottomTrim, 0.4, 220)
      cam.position.copy(lookWorld).add(new THREE.Vector3(0, cameraLiftY, 0))
      cam.lookAt(lookWorld)
    } else {
      cam.left = -halfW
      cam.right = halfW
      cam.top = halfH
      cam.bottom = baseBottom + bottomTrim
      cam.updateProjectionMatrix()
    }
  }
  resize()
  let ro = null
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resize())
    ro.observe(containerEl)
  } else {
    window.addEventListener('resize', resize)
  }

  return {
    scene,
    get camera() {
      return /** @type {THREE.OrthographicCamera} */ (cam)
    },
    renderer,
    dispose: () => {
      if (ro) ro.disconnect()
      else window.removeEventListener('resize', resize)
      disposeObject(scene)
      renderer.dispose()
      if (renderer.domElement.parentElement) renderer.domElement.remove()
    },
  }
}
