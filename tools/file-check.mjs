/**
 * file-check.mjs — prova o modo Arquivo pelo navegador, como um usuário faz.
 *
 * O api-check chama o handler direto e o live-check dirige o modo ao vivo. Faltava
 * o caminho que mais gente usa: escolher um arquivo, esperar a barra, ler o texto
 * e salvar. Ele passa por decodificação, reamostragem para 16 kHz, fatiamento no
 * silêncio, envio, e pelo IndexedDB no fim — nada disso os outros dois cobrem.
 *
 *   node tools/file-check.mjs [--audio .test-audio.wav] [--url http://localhost:5173]
 *
 * Consome requisição(ões) da Groq — uma por fatia de 2 min.
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const BASE = flag('url', 'http://localhost:5173');
const OUT = flag('out', '.screenshots');
const THEME = flag('theme', 'dark');
const AUDIO = resolve(flag('audio', '.test-audio.wav'));

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
});

const page = await context.newPage();
const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

await page.goto(`${BASE}/#/transcriber`, { waitUntil: 'networkidle' });
await page.evaluate((t) => localStorage.setItem('openear:theme', t), THEME);
await page.reload({ waitUntil: 'networkidle' });

await page.getByRole('tab', { name: /arquivo/i }).click();
console.log(`· enviando ${AUDIO}`);

// setInputFiles no input escondido: o seletor nativo do sistema não é dirigível,
// e clicar no rótulo abriria justamente ele.
await page.locator('input[type="file"]').first().setInputFiles(AUDIO);

const started = Date.now();
const text = await page
  .waitForFunction(
    () => {
      // `.transcript__line` é o parágrafo do texto pronto. A barra de progresso
      // vive noutro cartão, então a presença dele já significa "terminou".
      const lines = [...document.querySelectorAll('.transcript__line')];
      const value = lines
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .join(' ');
      return value || null;
    },
    null,
    { timeout: 120_000, polling: 500 },
  )
  .then((handle) => handle.jsonValue())
  .catch(() => null);

const elapsed = ((Date.now() - started) / 1000).toFixed(1);

if (text) console.log(`· transcrito em ${elapsed}s: "${text.replace(/\s+/g, ' ').slice(0, 160)}"`);
else problems.push(`nenhum texto apareceu em 120s`);

await page.screenshot({ path: `${OUT}/${THEME}-file-result.png`, fullPage: true });
console.log(`✓ ${OUT}/${THEME}-file-result.png`);

// Salvar é o que leva para o IndexedDB. Sem este passo o driver pararia antes da
// única parte que persiste algo.
const save = page.getByRole('button', { name: /^salvar$/i });
let saved = 0;
if (await save.isEnabled().catch(() => false)) {
  await save.click();
  await page.waitForTimeout(1500);
  saved = await page.evaluate(
    () =>
      new Promise((done) => {
        const req = indexedDB.open('openear');
        req.onsuccess = () => {
          const db = req.result;
          const store = [...db.objectStoreNames].find((n) => /session|transcri/i.test(n));
          if (!store) return done(-1);
          const count = db.transaction(store).objectStore(store).count();
          count.onsuccess = () => done(count.result);
          count.onerror = () => done(-1);
        };
        req.onerror = () => done(-1);
      }),
  );
  console.log(`· salvo — ${saved} transcrição(ões) no IndexedDB`);
} else {
  problems.push('o botão Salvar não ficou habilitado');
}

await page.screenshot({ path: `${OUT}/${THEME}-transcriptions-after-save.png`, fullPage: true });
console.log(`✓ ${OUT}/${THEME}-transcriptions-after-save.png`);

await browser.close();

if (problems.length) {
  console.log('\n⚠ problemas:');
  for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
  process.exit(2);
}
console.log('\nModo Arquivo provado: envio → transcrição → salvar.');
