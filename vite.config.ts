import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  cacheDir: `node_modules/.vite-${process.env.PORT || '3000'}`,
  plugins: [vue()],
  optimizeDeps: { include: ['vue', 'pinia', 'vue-router', '@tiptap/vue-3', '@tiptap/starter-kit', '@tiptap/extension-text-align', 'isomorphic-dompurify'] },
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
          // Keep the rich-text editor off the public portfolio's critical path.
          if (/node_modules\/(?:@tiptap\/|prosemirror-|orderedmap\/|rope-sequence\/|w3c-keyname\/|crelt\/)/.test(id)) return 'cv-editor-vendor'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
  server: { middlewareMode: true, hmr: { port: Number(process.env.PORT || 3000) + 10000 } },
  appType: 'custom',
})
