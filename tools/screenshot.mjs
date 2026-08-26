/**
 * screenshot.mjs — captura as telas do app rodando.
 *
 * Existe porque "compilou" não é a mesma coisa que "está certo na tela". Roda
 * contra o dev server, atravessa as quatro rotas nos dois temas e salva em
 * `.screenshots/`. É a única forma honesta de afirmar que a UI ficou boa.
 *
 *   node tools/screenshot.mjs [--url http://localhost:5173] [--mobile]
 */

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};

const BASE = flag('url', 'http://localhost:5173');
const OUT = flag('out', '.screenshots');
const MOBILE = args.includes('--mobile');

const ROUTES = ['home', 'transcriber', 'transcriptions', 'library', 'settings'];
const THEMES = ['dark', 'light'];
const SEED = args.includes('--seed');

/**
 * Capturar só telas vazias esconde justamente o que costuma quebrar: altura de
 * linha em título longo, badge da sidebar, truncamento, item com e sem marca de
 * "já transcrito". Este seed escreve direto no IndexedDB do app.
 */
const SEED_SCRIPT = () =>
  new Promise((resolve, reject) => {
    // Versão 2 = a das pastas. Abrir na 1 com o banco já na 2 lança VersionError.
    const open = indexedDB.open('openear', 2);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(['sessions', 'files', 'folders'], 'readwrite');
      const sessions = tx.objectStore('sessions');
      const files = tx.objectStore('files');
      const folders = tx.objectStore('folders');

      /**
       * Ancorado em "hoje", não numa data fixa. O arquivo agrupa por recência
       * (Hoje / Ontem / Últimos 7 dias / …); com data fixa toda a captura cairia
       * em "Mais antigas" e os cabeçalhos de grupo nunca apareceriam na prova.
       */
      const midnight = new Date();
      midnight.setHours(9, 30, 0, 0);
      const base = midnight.getTime();
      const rows = [
        {
          title: 'Reunião de terça com o time de produto sobre o roadmap',
          mode: 'live',
          durationSeconds: 1847,
          text: 'Boa tarde a todos. Vamos começar pelo que ficou pendente da semana passada.\n\nO time de design já entregou as telas novas, falta só a revisão de acessibilidade antes de subir.\n\nSobre prazo: a data de entrega continua a mesma, mas precisamos decidir hoje quem assume a parte de integração.',
        },
        {
          title: 'consulta-dra-marina.m4a',
          mode: 'file',
          durationSeconds: 923,
          text: 'Os exames voltaram dentro do esperado. A dosagem continua igual por mais trinta dias.\n\nQualquer sintoma novo, me manda mensagem antes de mudar qualquer coisa por conta.',
        },
        {
          title: 'Conversa no balcão da farmácia',
          mode: 'live',
          durationSeconds: 96,
          text: 'Esse aqui é o genérico, sai por vinte e dois reais. O de marca fica cinquenta e nove.',
        },
      ];

      // Hoje, ontem e nove dias atrás: três grupos de recência diferentes.
      const daysAgo = [0, 1, 9];
      rows.forEach((row, i) => {
        sessions.put({ ...row, id: `seed-s-${i}`, createdAt: base - daysAgo[i] * 86_400_000 });
      });

      /**
       * Duas pastas e três soltos: a captura precisa provar a grade de pastas, a
       * contagem de cada uma E a lista da raiz no mesmo quadro. Só pastas
       * esconderia os soltos; só soltos esconderia a grade inteira.
       */
      [
        { id: 'seed-d-0', name: 'Aulas' },
        { id: 'seed-d-1', name: 'Consultas médicas' },
      ].forEach((d, i) => folders.put({ ...d, createdAt: base - i * 86_400_000 }));

      const blob = new Blob([new Uint8Array(2048)], { type: 'audio/mpeg' });
      [
        { name: 'aula-libras-modulo-3.mp3', size: 18_400_000, done: true, folderId: 'seed-d-0' },
        { name: 'aula-libras-modulo-4.mp3', size: 15_100_000, done: false, folderId: 'seed-d-0' },
        { name: 'consulta-dra-marina.m4a', size: 4_120_000, done: true, folderId: 'seed-d-1' },
        { name: 'entrevista-candidato-final.m4a', size: 7_250_000, done: false },
        { name: 'audio-whatsapp-2026-08-14.ogg', size: 946_000, done: false },
        { name: 'Gravação ao vivo — 25/08/2026 14:32.wav', size: 3_480_000, done: true },
      ].forEach((f, i) => {
        files.put({
          id: `seed-f-${i}`,
          name: f.name,
          addedAt: base - i * 43_200_000,
          size: f.size,
          type: 'audio/mpeg',
          blob,
          ...(f.done ? { sessionId: 'seed-s-1' } : {}),
          ...(f.folderId ? { folderId: f.folderId } : {}),
        });
      });

      tx.oncomplete = () => resolve('ok');
      tx.onerror = () => reject(tx.error);
    };
  });

const viewport = MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 960 };

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 2,
  locale: 'pt-BR',
  // Sem isso o botão de legendar pede permissão e o estado inicial fica errado.
  permissions: ['microphone'],
});

const page = await context.newPage();
const problems = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') problems.push(`console: ${msg.text()}`);
});
page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`));

if (SEED) {
  // Precisa de uma visita antes: o app cria o banco no primeiro acesso.
  await page.goto(`${BASE}/#/transcriber`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  await page.evaluate(SEED_SCRIPT);
  console.log('· dados de exemplo gravados no IndexedDB');
}

for (const theme of THEMES) {
  for (const route of ROUTES) {
    await page.goto(`${BASE}/#/${route}`, { waitUntil: 'networkidle' });

    // O tema mora em localStorage; força e recarrega para pegar o estado real,
    // não um data-attribute injetado por fora.
    await page.evaluate((t) => localStorage.setItem('openear:theme', t), theme);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(350);

    const suffix = MOBILE ? '-mobile' : '';
    const file = `${OUT}/${theme}-${route}${suffix}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${file}`);
  }
}

await browser.close();

if (problems.length) {
  console.log('\n⚠ erros no console durante a captura:');
  for (const p of [...new Set(problems)]) console.log(`  - ${p}`);
  process.exit(2);
}
console.log('\nSem erros de console.');
