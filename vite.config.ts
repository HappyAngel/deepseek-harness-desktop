import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src/renderer',
  // Electron loads this page through file://, where /assets points at the
  // filesystem root rather than this application's renderer directory.
  base: './',
  build: {
    outDir: '../../renderer',
    emptyOutDir: true,
  },
})
