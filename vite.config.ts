import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'PigeonMatch',
      fileName: (format) => `pigeonmatch.${format}.js`,
      formats: ['es']
    },
    rollupOptions: {
      external: ['vue', 'peerpigeon', 'eventemitter3'],
      output: {
        globals: {
          vue: 'Vue',
          peerpigeon: 'PeerPigeon',
          eventemitter3: 'EventEmitter3'
        }
      }
    }
  }
})
