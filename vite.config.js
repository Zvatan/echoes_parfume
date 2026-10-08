import { defineConfig } from 'vite';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Kaynak sayfa: src/index.html (npm run dev bunu sunar).
// Derleme çıktısı tek bir HTML dosyasıdır (CSS, JS, 3D modeller ve görseller gömülü) ve
// proje kökündeki index.html olarak da kopyalanır; böylece site sunucu olmadan çift
// tıklanarak ya da GitHub Pages'te depo kökünden doğrudan açılır.
const ROOT_INDEX = fileURLToPath(new URL('./index.html', import.meta.url));
const DIST_INDEX = fileURLToPath(new URL('./dist/index.html', import.meta.url));

export default defineConfig({
  root: 'src',
  base: './',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: () => true,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
  plugins: [singleFile()],
});

function singleFile() {
  return {
    name: 'echoes-single-file',
    apply: 'build',
    enforce: 'post',
    // Vite'ın kendi son işlemleri (ör. dinamik import yardımcıları) bittikten sonra çalışmalı.
    generateBundle: { order: 'post', handler: inlineBundle },
    closeBundle() {
      copyFileSync(DIST_INDEX, ROOT_INDEX);
    },
  };
}

// JS ve CSS dosyalarını HTML'in içine gömer.
function inlineBundle(_, bundle) {
  const html = Object.values(bundle).find((f) => f.fileName.endsWith('.html'));
  if (!html) return;
  let src = html.source;
  for (const [name, file] of Object.entries(bundle)) {
    if (file.type === 'chunk' && file.isEntry) {
      const code = file.code.replace(/<\/script/gi, '<\\/script');
      src = src.replace(new RegExp(`<script[^>]*src="[^"]*${escape(name)}"[^>]*></script>`), () => `<script type="module">${code}</script>`);
      delete bundle[name];
    } else if (name.endsWith('.css')) {
      src = src.replace(new RegExp(`<link[^>]*href="[^"]*${escape(name)}"[^>]*>`), () => `<style>${file.source}</style>`);
      delete bundle[name];
    }
  }
  html.source = src;
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
