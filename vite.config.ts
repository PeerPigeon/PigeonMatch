import { defineConfig } from 'vitest/config'

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
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
})
