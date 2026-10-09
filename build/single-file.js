import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vite eklentisi: derleme çıktısını tek bir HTML dosyasına gömer (JS, CSS ve
// assetsInlineLimit ile görseller/modeller dahil). Böylece dosya sunucusuz, çift
// tıklanarak açılabilir.
//   fileName: çıktı HTML'inin outDir içindeki adı
//   copyTo:   derleme bitince dosyanın kopyalanacağı ek yollar (proje köküne göre)
export function singleFile({ fileName = 'index.html', copyTo = [] } = {}) {
  let outFile = '';
  return {
    name: 'echoes-single-file',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      // outDir, Vite'ın kök klasörüne (root: 'src') göre tanımlıdır.
      outFile = resolve(config.root, config.build.outDir, fileName);
    },
    // Vite'ın kendi son işlemleri (ör. dinamik import yardımcıları) bittikten sonra çalışmalı.
    generateBundle: {
      order: 'post',
      handler(_, bundle) {
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
        html.fileName = fileName;
      },
    },
    closeBundle() {
      for (const target of copyTo) copyFileSync(outFile, resolve(process.cwd(), target));
    },
  };
}

function escape(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
