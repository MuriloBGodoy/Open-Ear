/**
 * api-check.mjs — prova que `api/transcribe.ts` fala com a Groq de verdade.
 *
 * Chama os handlers direto, sem subir servidor: o Node 24 executa TypeScript por
 * type stripping, e as funções são API web padrão (Request → Response) — que é
 * a assinatura do Netlify Functions v2. O código exercitado aqui é o mesmo que
 * roda em produção; o roteamento da plataforma é que fica de fora.
 *
 *   node tools/api-check.mjs
 *
 * Precisa de GROQ_API_KEY no ambiente ou em frontend/.env.local.
 * **Consome uma requisição da Groq**, porque a transcrição é real.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile(join(root, 'frontend', '.env.local'));
} catch {
  // Sem .env.local: seguimos com o que já estiver no ambiente.
}

// pathToFileURL, e não o caminho cru: no Windows o loader ESM lê "C:" como
// protocolo de URL e recusa.
const fn = (file) =>
  import(pathToFileURL(join(root, 'frontend', 'netlify', 'functions', file)).href);

const { default: transcribe } = await fn('transcribe.mts');
const { default: health } = await fn('health.mts');

let failed = false;

const check = (label, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed = true;
};

// 1. health
const healthBody = await (await health()).json();
check(
  'health',
  healthBody.ok && healthBody.groqConfigured,
  JSON.stringify(healthBody),
);

// 2. sem arquivo → 400 legível, não stack trace
const empty = await transcribe(
  new Request('http://localhost/api/transcribe', { method: 'POST', body: new FormData() }),
);
const emptyBody = await empty.json();
check('sem áudio → 400', empty.status === 400, `${empty.status} ${emptyBody.error}`);

// 3. GET → 405
const wrongMethod = await transcribe(new Request('http://localhost/api/transcribe'));
check('GET → 405', wrongMethod.status === 405);

// 4. transcrição real
const wav = await readFile(join(root, '.test-audio.wav'));
const form = new FormData();
form.append('file', new File([wav], 'audio.wav', { type: 'audio/wav' }), 'audio.wav');
form.append('mode', 'file');

const started = Date.now();
const res = await transcribe(
  new Request('http://localhost/api/transcribe', { method: 'POST', body: form }),
);
const body = await res.json();
const elapsed = ((Date.now() - started) / 1000).toFixed(2);

check(
  `transcrição real (${(wav.length / 1024).toFixed(0)} KB, ${elapsed}s)`,
  res.status === 200 && typeof body.text === 'string' && body.text.trim().length > 0,
  res.status === 200 ? `"${(body.text ?? '').trim()}"` : `${res.status} ${body.error}`,
);

// `verbose_json` no modo Arquivo: sem os tempos, a tela de transcrição perde os
// carimbos de segmento.
check('modo Arquivo traz segments', Array.isArray(body.segments) && body.segments.length > 0);

console.log(failed ? '\nFALHOU' : '\nTudo certo.');
// exitCode, e não process.exit(): sair na marra enquanto o loader de type
// stripping ainda está de pé derruba o libuv no Windows e o código de saída vira
// lixo — o oposto do que um script de verificação precisa entregar.
process.exitCode = failed ? 1 : 0;
