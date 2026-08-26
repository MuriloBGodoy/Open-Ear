#!/usr/bin/env node
/**
 * design-research.mjs — coletor de referências visuais do agente Michelangelo.
 *
 * Abre um Chromium real, busca referências de UI, baixa as imagens como arquivo
 * local e grava um `sources.json` com o link REAL de cada referência.
 *
 * O sources.json é o contrato de honestidade: se uma referência não está lá,
 * ela não foi coletada e o Michelangelo não pode citá-la.
 *
 * FONTES
 *   dribbble  (padrão) — funciona sem login, server-rendered, ótimo para UI.
 *   pinterest          — exige sessão salva. Deslogado, o Pinterest esconde o
 *                        grid atrás de um modal de login e serve só a colagem
 *                        decorativa, sem link de pin. Rode `pinterest-login.mjs`
 *                        uma vez para habilitar.
 *
 * USO
 *   node tools/design-research.mjs --query "live caption ui" --out designs/live-caption/pins
 *   node tools/design-research.mjs --query "..." --out ... --source pinterest --limit 10
 *   node tools/design-research.mjs --query "..." --out ... --source both
 *
 * EXIT CODES
 *   0 = coletou pelo menos uma referência
 *   3 = nada coletado (reporte ao usuário; NÃO invente referências)
 *   4 = pinterest pedido mas sem sessão salva
 */

import { chromium } from 'playwright';
import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const SESSION_PATH = path.join(import.meta.dirname, '.pinterest-session.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}

const args = parseArgs(process.argv);
const query = args.query;
const outDir = args.out;
const limit = Number(args.limit ?? 8);
const source = (args.source ?? 'dribbble').toLowerCase();

if (!query || !outDir) {
  console.error(
    'uso: node tools/design-research.mjs --query "<busca em ingles>" --out <pasta> [--limit 8] [--source dribbble|pinterest|both]'
  );
  process.exit(1);
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

const querySlug = slugify(query);
const log = (...m) => console.error('[michelangelo]', ...m);

const exists = (p) => access(p).then(() => true, () => false);

/* ------------------------------------------------------------------ dribbble */

async function scrapeDribbble(context, q, max) {
  const page = await context.newPage();
  const url = `https://dribbble.com/search/shots/popular?q=${encodeURIComponent(q)}`;
  log(`dribbble: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3500);
    for (let i = 0; i < 3; i++) {
      await page.mouse.wheel(0, 2000);
      await page.waitForTimeout(1500);
    }
    const found = await page.evaluate(() => {
      const out = [];
      for (const a of document.querySelectorAll('a[href*="/shots/"]')) {
        const img = a.querySelector('img') ?? a.parentElement?.querySelector('img');
        const src = img?.getAttribute('src') ?? img?.getAttribute('data-src');
        if (!src || !/cdn\.dribbble/.test(src)) continue;
        const href = a.getAttribute('href')?.split('?')[0];
        if (!href) continue;
        out.push({
          sourceUrl: 'https://dribbble.com' + href,
          // o CDN entrega thumb de 400x300 por padrão; pede a versão legível
          imageUrl: src.replace(/resize=\d+x\d+/, 'resize=1200x900'),
          title: (img.getAttribute('alt') ?? '').trim().slice(0, 140),
          site: 'dribbble',
        });
      }
      return [...new Map(out.map((o) => [o.sourceUrl, o])).values()];
    });
    log(`dribbble: ${found.length} shots encontrados`);
    return found.slice(0, max);
  } catch (err) {
    log(`dribbble falhou: ${err.message}`);
    return [];
  } finally {
    await page.close();
  }
}

/* ----------------------------------------------------------------- pinterest */

async function scrapePinterest(context, q, max) {
  const page = await context.newPage();
  const url = `https://br.pinterest.com/search/pins/?q=${encodeURIComponent(q)}`;
  log(`pinterest: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4000);
    await page.keyboard.press('Escape').catch(() => {});

    for (let i = 0; i < 5; i++) {
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(1400);
    }

    const found = await page.evaluate(() => {
      const out = [];
      for (const img of document.querySelectorAll('img[src*="pinimg.com"]')) {
        const src = img.getAttribute('src');
        // descarta avatar, ícone e os chips de tópico do topo (60x60 / 75x75)
        if (!src || !/\/(236x|474x|564x|736x|originals)\//.test(src)) continue;
        const anchor = img.closest('a[href*="/pin/"]');
        const href = anchor?.getAttribute('href');
        // Sem link de pin não há fonte citável — descarta.
        if (!href) continue;
        out.push({
          sourceUrl: new URL(href, 'https://br.pinterest.com').toString(),
          imageUrl: src.replace(/\/(236x|474x|564x)\//, '/736x/'),
          title: (img.getAttribute('alt') ?? '').trim().slice(0, 140),
          site: 'pinterest',
        });
      }
      return [...new Map(out.map((o) => [o.sourceUrl, o])).values()];
    });

    if (found.length === 0) {
      const walled = await page.evaluate(() =>
        /não entrou na conta|Entre para ter a melhor|Continuar com o Google/i.test(document.body.innerText)
      );
      log(
        walled
          ? 'pinterest: MODAL DE LOGIN bloqueou o grid. Rode `node tools/pinterest-login.mjs` uma vez.'
          : 'pinterest: grid vazio ou layout mudou; nenhum pin com link encontrado.'
      );
    } else {
      log(`pinterest: ${found.length} pins com link encontrados`);
    }
    return found.slice(0, max);
  } catch (err) {
    log(`pinterest falhou: ${err.message}`);
    return [];
  } finally {
    await page.close();
  }
}

/* --------------------------------------------------------------------- main */

const hasSession = await exists(SESSION_PATH);
const wantsPinterest = source === 'pinterest' || source === 'both';

if (source === 'pinterest' && !hasSession) {
  log('ERRO: --source pinterest exige sessão salva.');
  log('Rode uma vez:  node tools/pinterest-login.mjs');
  log('Ou use:        --source dribbble  (funciona sem login)');
  process.exit(4);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1600, height: 1100 },
  userAgent: UA,
  locale: 'pt-BR',
  ...(wantsPinterest && hasSession ? { storageState: SESSION_PATH } : {}),
});

if (wantsPinterest && hasSession) log('usando sessão salva do Pinterest');

let refs = [];
if (source === 'dribbble' || source === 'both') refs.push(...(await scrapeDribbble(context, query, limit)));
if (wantsPinterest) refs.push(...(await scrapePinterest(context, query, limit)));

refs = refs.slice(0, limit);

if (refs.length === 0) {
  log('ZERO referências coletadas.');
  log('-> Diga isso ao usuário explicitamente. NÃO invente referências nem descreva imagens que não viu.');
  await browser.close();
  process.exit(3);
}

await mkdir(outDir, { recursive: true });

const manifest = [];
for (const [i, ref] of refs.entries()) {
  const n = String(i + 1).padStart(2, '0');
  const nameHint = slugify(ref.title || query) || querySlug;
  const file = `${n}--${nameHint}--${ref.site}.jpg`;
  try {
    const res = await context.request.get(ref.imageUrl, { timeout: 25000 });
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    await writeFile(path.join(outDir, file), await res.body());
    manifest.push({ file, ...ref });
    log(`ok  ${file}`);
  } catch (err) {
    log(`pulou ${file}: ${err.message}`);
  }
}

await writeFile(
  path.join(outDir, 'sources.json'),
  JSON.stringify(
    { query, source, collectedAt: null, collected: manifest.length, references: manifest },
    null,
    2
  )
);

await browser.close();

console.log(JSON.stringify({ query, source, out: outDir, collected: manifest.length, references: manifest }, null, 2));
log(`${manifest.length} referências salvas em ${outDir}`);
