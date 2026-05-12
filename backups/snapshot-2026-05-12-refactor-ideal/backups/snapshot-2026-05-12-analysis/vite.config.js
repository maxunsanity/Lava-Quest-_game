import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  publicDir: 'public',
  // dist를 하위 경로·로컬 폴더에서 열 때도 에셋·CSV 상대 경로로 해석
  base: './',
})
