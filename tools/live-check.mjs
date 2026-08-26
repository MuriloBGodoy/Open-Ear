/**
 * live-check.mjs — prova a legenda ao vivo de ponta a ponta, no navegador.
 *
 * O screenshot.mjs só captura telas paradas, e o modo ao vivo é justamente o que
 * tem estado: cronômetro andando, medidor com barra acesa, bolha da última fala.
 * Aqui o Chromium entra com microfone falso, o botão é clicado de verdade e a
 * captura sai com a sessão em andamento.
 *
 * **Alimenta o microfone com um WAV real**, não com o bipe sintético do
 * `--use-fake-device-for-media-stream`. Com o bipe, a Groq devolvia texto vazio e
 * o driver dizia "1 bolha" sobre uma bolha que só continha "transcrevendo…" —
 * verde sobre nada. Com áudio de verdade, ele espera o texto aparecer e falha se
 * não aparecer, então o que ele afirma é o caminho inteiro: microfone → VAD →
 * fatia → função → Groq → tela.
 *
 * Consome uma requisição da Groq.
 *
 *   node tools/live-check.mjs [--seconds 14] [--theme dark]
 *                             [--url http://localhost:5173] [--audio .test-audio.wav]
 *
 * O `--url` importa: sem função servindo `/api/*`, não há o que provar.
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
const SECONDS = Number(flag('seconds', '14'));
const AUDIO = resolve(flag('audio', '.test-audio.wav'));

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    // Troca o bipe pelo arquivo. `%noloop` para não repetir em círculo: a fala
    // precisa ter fim, senão o VAD nunca fecha o segmento e nada é enviado.
    // Exige WAV PCM — que é exatamente o que o `encodeWav` do app produz.
    `--use-file-for-fake-audio-capture=${AUDIO}%noloop`,
    '--autoplay-policy=no-user-gesture-required',
  ],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
  permissions: ['microphone'],
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

await page.getByRole('button', { name: /come(ç|c)ar a legendar/i }).click();
console.log(`· gravando, microfone alimentado por ${AUDIO}`);

// Espera a bolha deixar de dizer "transcrevendo…". É aqui que o driver deixa de
// medir a interface e passa a medir o caminho todo — antes ele fechava o
// navegador ainda com o POST no ar, cancelando a própria prova.
const spoken = await page
  .waitForFunction(
    () => {
      const bubble = document.querySelector('.bubble');
      const text = bubble?.textContent?.trim();
      if (!text || /transcrevendo/i.test(text)) return null;
      return text;
    },
    null,
    { timeout: 60_000, polling: 500 },
  )
  .then((handle) => handle.jsonValue())
  .catch(() => null);

if (spoken) console.log(`· transcrito: "${spoken.replace(/\s+/g, ' ')}"`);
else problems.push('a bolha nunca saiu de "transcrevendo…" em 60s');

// Segue gravando até o tempo pedido, para o print sair com o cronômetro andando.
await page.waitForTimeout(Math.max(0, SECONDS * 1000 - 2000));

await page.screenshot({ path: `${OUT}/${THEME}-live-recording.png`, fullPage: true });
console.log(`✓ ${OUT}/${THEME}-live-recording.png`);

// Pausado é um estado próprio: cronômetro congela e o medidor tem que zerar.
await page.getByRole('button', { name: /^pausar$/i }).click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/${THEME}-live-paused.png`, fullPage: true });
console.log(`✓ ${OUT}/${THEME}-live-paused.png`);

const state = await page.evaluate(() => ({
  clock: document.querySelector('.clock')?.textContent,
  bubbles: document.querySelectorAll('.bubble').length,
  badge: document.querySelector('.badge')?.textContent?.trim(),
}));
console.log('estado:', JSON.stringify({ ...state, transcrito: Boolean(spoken) }));

await browser.close();

if (problems.length) {
  console.log('\n⚠ problemas:');
  for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
  process.exit(2);
}
console.log('\nCaminho completo provado, sem erros de console.');
