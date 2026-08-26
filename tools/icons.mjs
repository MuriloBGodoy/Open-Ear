/**
 * icons.mjs — gera os PNG do PWA a partir de `public/icon.svg`.
 *
 *   node tools/icons.mjs
 *
 * Por que existe: navegador só oferece "instalar" quando o manifesto traz PNG de
 * 192 e 512. Com SVG apenas, o app abre no navegador mas não vira app.
 *
 * Usa o Playwright (já é dependência dos outros drivers) como rasterizador, em
 * vez de trazer sharp/canvas só para três arquivos.
 *
 * Dois tratamentos diferentes, de propósito:
 *
 * - **any** — o ícone como desenhado, com os cantos arredondados do próprio SVG
 *   e fundo transparente em volta.
 * - **maskable** — fundo sangrando até a borda e o desenho reduzido a 70%. O
 *   sistema operacional recorta o ícone na forma que quiser (círculo, squircle);
 *   se o conteúdo encostar na borda, ele perde pedaço. O `rx` do SVG some aqui
 *   porque o fundo atrás é da mesma cor — que é exatamente o efeito desejado.
 */

import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'frontend', 'public');

/** Mesmo near-black azulado do `background_color` do manifesto. */
const BACKDROP = '#0b1420';

const svg = await readFile(join(publicDir, 'icon.svg'), 'utf8');

const targets = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });

for (const { file, size, maskable } of targets) {
  const inner = maskable ? Math.round(size * 0.7) : size;
  const pad = Math.round((size - inner) / 2);

  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<!doctype html><meta charset="utf-8">
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        width: ${size}px; height: ${size}px;
        background: ${maskable ? BACKDROP : 'transparent'};
      }
      svg { display: block; width: ${inner}px; height: ${inner}px; margin: ${pad}px; }
    </style>
    ${svg}`);

  await page.screenshot({
    path: join(publicDir, file),
    omitBackground: !maskable,
    clip: { x: 0, y: 0, width: size, height: size },
  });

  console.log(`✓ public/${file}  ${size}×${size}${maskable ? ' (maskable)' : ''}`);
}

await browser.close();
