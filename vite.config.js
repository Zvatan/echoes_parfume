import { defineConfig } from 'vite';

// Derleme çıktısı tek bir HTML dosyasıdır (CSS, JS, 3D model ve görseller gömülü),
// böylece dist/index.html bir sunucu olmadan, çift tıklanarak açılabilir.
export default defineConfig({
  base: './',
  build: {
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
    // Kaynak index.html'deki "dosyadan açıldıysa derlenmiş sürüme git" yönlendirmesi
    // derlenmiş dosyada gereksizdir.
    transformIndexHtml: {
      order: 'pre',
      handler: (html) => html.replace(/<script data-dev-only>[\s\S]*?<\/script>\s*/, ''),
    },
    // Vite'ın kendi son işlemleri (ör. dinamik import yardımcıları) bittikten sonra çalışmalı.
    generateBundle: { order: 'post', handler: inlineBundle },
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
