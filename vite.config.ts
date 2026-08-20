import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/renderer',
  build: {
    outDir: '../../renderer',
    emptyOutDir: true,
  },
})
