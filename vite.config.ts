import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@admin': fileURLToPath(new URL('./src/admin', import.meta.url)),
      '@site': fileURLToPath(new URL('./src/public', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    // Objectif : bundle public < 500 KB. L'admin est isolé dans son propre chunk,
    // chargé uniquement quand on ouvre le panneau (import dynamique du routeur).
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Un seul chunk de dépendances : les découper plus finement crée des
          // cycles entre eux (vue-router réimporte @vue/runtime-core, etc.).
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: { middlewareMode: true },
  appType: 'custom',
})
