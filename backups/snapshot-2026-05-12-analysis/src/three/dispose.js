import * as THREE from 'three'

export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        for (const k of Object.keys(m)) {
          const v = m[k]
          if (v && v.isTexture) v.dispose()
        }
        m.dispose?.()
      }
    }
  })
}
