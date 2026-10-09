import { defineConfig } from 'vite';
import { singleFile } from './build/single-file.js';

// YÖNETİM PANELİ derlemesi: src/admin/index.html → dist/admin.html ve kökteki admin.html
// (site derlemesinden SONRA çalışır; dist klasörünü boşaltmaz).
// Test derlemesi: ECHOES_OUT_DIR ayrı klasöre derler, kökteki admin.html'e dokunmaz.
const testOut = process.env.ECHOES_OUT_DIR;

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: testOut || '../dist',
    emptyOutDir: false,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      input: 'src/admin/index.html',
      output: { inlineDynamicImports: true },
    },
  },
  plugins: [singleFile({ fileName: 'admin.html', copyTo: testOut ? [] : ['admin.html'] })],
});
