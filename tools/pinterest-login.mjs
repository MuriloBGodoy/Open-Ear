#!/usr/bin/env node
/**
 * pinterest-login.mjs — login manual único para liberar o Pinterest ao Michelangelo.
 *
 * Abre um Chromium VISÍVEL na tela de login do Pinterest. Você entra na sua conta
 * na mão (email, Google, o que preferir). Ao terminar, volte no terminal e aperte
 * ENTER: a sessão é salva em `tools/.pinterest-session.json`.
 *
 * A partir daí o `design-research.mjs --source pinterest` funciona headless, com o
 * grid de busca completo e link real de cada pin.
 *
 * A sessão é sua e fica só na sua máquina — o arquivo está no .gitignore.
 * Cookies do Pinterest duram bastante; se um dia parar de funcionar, rode de novo.
 *
 *   node tools/pinterest-login.mjs
 */

import { chromium } from 'playwright';
import path from 'node:path';
import readline from 'node:readline';

const SESSION_PATH = path.join(import.meta.dirname, '.pinterest-session.json');

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({
  viewport: { width: 1400, height: 950 },
  locale: 'pt-BR',
});
const page = await context.newPage();

await page.goto('https://br.pinterest.com/login/', { waitUntil: 'domcontentloaded' });

console.log('');
console.log('  Um Chromium abriu na tela de login do Pinterest.');
console.log('  1. Entre na sua conta normalmente.');
console.log('  2. Espere o feed carregar.');
console.log('  3. Volte aqui e aperte ENTER para salvar a sessão.');
console.log('');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await new Promise((resolve) => rl.question('  Pronto? ENTER para salvar... ', resolve));
rl.close();

// Confere se realmente logou antes de salvar uma sessão inútil.
const loggedIn = await page
  .evaluate(() => !/Continuar com o Google|Continuar com o email/i.test(document.body.innerText))
  .catch(() => false);

await context.storageState({ path: SESSION_PATH });
await browser.close();

if (loggedIn) {
  console.log(`\n  Sessão salva em ${SESSION_PATH}`);
  console.log('  Teste com:');
  console.log('    node tools/design-research.mjs --query "live caption ui" --out designs/_teste/pins --source pinterest\n');
} else {
  console.log(`\n  AVISO: a página ainda parecia deslogada. Sessão salva em ${SESSION_PATH},`);
  console.log('  mas talvez não funcione. Se der erro, rode este script de novo.\n');
}
