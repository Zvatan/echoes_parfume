import { defineConfig } from 'vite';
import { singleFile } from './build/single-file.js';

// SİTE derlemesi.
// Kaynak sayfa: src/index.html (npm run dev bunu sunar; panel: /admin/).
// Çıktı tek bir HTML dosyasıdır (CSS, JS, 3D modeller ve görseller gömülü) ve proje
// kökündeki index.html olarak da kopyalanır; böylece site sunucu olmadan çift tıklanarak
// ya da GitHub Pages'te depo kökünden doğrudan açılır.
// Yönetim paneli ayrı derlenir: vite.admin.config.js → admin.html
//
// Test derlemesi (tests/run-all.mjs): ECHOES_OUT_DIR ayrı bir klasöre derler ve kökteki
// index.html'e DOKUNMAZ.
const testOut = process.env.ECHOES_OUT_DIR;

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: testOut || '../dist',
    emptyOutDir: true,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  plugins: [singleFile({ fileName: 'index.html', copyTo: testOut ? [] : ['index.html'] })],
});
