#!/usr/bin/env node
/**
 * contrast.mjs — calculadora WCAG 2.x. É a régua que PROVA cada par da paleta
 * Open Ear. Não é código do app; é ferramenta de design.
 *
 *   node designs/_design-system/contrast.mjs
 *
 * Saída: rampas completas + tabela par-por-par nos dois temas. Meta: 0 falhas.
 */

const hex2rgb = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lum = (h) =>
  hex2rgb(h)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
export const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const r = (a, b) => Math.round(ratio(a, b) * 100) / 100;

/* ============================ RAMPAS ============================ */

/** Miami blue. Âncora em 500 (#00B0DC ~ Porsche Miami Blue). */
export const cyan = {
  50: '#E8FAFF',
  100: '#C7F1FC',
  200: '#96E5F9',
  300: '#55D2F1',
  400: '#18BCE4',
  500: '#00B0DC',
  600: '#0090B6',
  700: '#00728F',
  800: '#0A5A70',
  900: '#0E4353',
  950: '#082B36',
};

/** Cinzas FRIOS (hue ~218). Neutro puro brigaria com o ciano; o frio casa. */
export const grey = {
  0: '#FFFFFF',
  25: '#F7F9FC',
  50: '#F1F4F9',
  100: '#E6EBF2',
  200: '#D4DBE5',
  300: '#B5BFCD',
  400: '#838EA0',
  500: '#697585',
  600: '#4F5A69',
  700: '#39424F',
  800: '#242C37',
  900: '#151B23',
  950: '#0C1118',
  1000: '#05080D',
};

/* ====================== TOKENS SEMÂNTICOS ====================== */

export const light = {
  bg: grey[50], //           #F1F4F9
  surface: grey[0], //       #FFFFFF
  surface2: grey[100], //    #E6EBF2
  surface3: grey[200], //    #D4DBE5
  border: '#C4CEDC', //      1.59 vs branco, 1.44 vs bg -> aresta percebida nos dois
  borderStrong: grey[400], // 3.31 vs branco -> passa 3:1 de non-text
  text: '#101720',
  text2: '#3D4653',
  text3: '#5A6472',
  accent: cyan[700], //      texto/ação sobre claro
  accentHover: cyan[800],
  accentText: '#FFFFFF',
  accentSoft: cyan[50],
  accentInk: cyan[900], //   texto sobre accent-soft
  accentUi: cyan[600], //    non-text (medidor, barra, borda ativa) sobre claro
  sidebarBg: grey[25],
  sidebarActive: cyan[50],
  live: '#B3183F',
  liveSoft: '#FDEBF0',
  ok: '#0A6A4A',
  okSoft: '#E4F5EE',
  warn: '#7E4E00',
  warnSoft: '#FDF2DE',
  danger: '#AF2318',
  dangerSoft: '#FDECEA',
  focus: cyan[700],
};

export const dark = {
  bg: '#05080D', //          near-black azulado (vem da referência)
  surface: '#16202D',
  surface2: '#243141',
  surface3: '#303F53',
  border: '#2F3D50',
  borderStrong: '#637286', // 3.35 vs surface -> passa non-text
  text: '#F2F6FB',
  text2: '#C4CEDB',
  text3: '#98A4B4',
  accent: cyan[400], //      #18BCE4 — o ciano finalmente pode brilhar
  accentHover: cyan[300],
  accentText: '#04222B',
  accentSoft: '#0B2E3B',
  accentInk: cyan[200],
  accentUi: cyan[500], //    Miami blue puro: 6.6:1 vs surface. Aqui ele mora.
  sidebarBg: '#0E1520',
  sidebarActive: '#0B2E3B',
  live: '#FF9DB4',
  liveSoft: '#3A1620',
  ok: '#5FD3A3',
  okSoft: '#0C2A21',
  warn: '#E8B058',
  warnSoft: '#2C2113',
  danger: '#FF9F94',
  dangerSoft: '#351A18',
  focus: cyan[400],
};

/* ========================== VALIDAÇÃO ========================== */

const rows = [];
const check = (theme, label, fg, bg, need, kind) =>
  rows.push({ theme, label, fg, bg, v: r(fg, bg), need, kind, pass: r(fg, bg) >= need });

const AAA = 7,
  AA = 4.5,
  AA_LG = 3, // texto grande >= 24px ou 19px bold
  NT = 3, // non-text contrast (WCAG 1.4.11)
  /**
   * Heurística própria, NÃO é WCAG. No tema claro a diferença entre um cartão
   * branco e a página cinza-clara é necessariamente pequena (1.10) — inflar isso
   * escureceria a página e cansaria a leitura longa. Então o piso de luminância
   * é baixo (1.08) e a aresta do cartão é garantida pelo teste BORDA abaixo.
   */
  SEP = 1.08,
  EDGE = 1.3; // borda precisa ser percebida contra a própria superfície

for (const [name, T] of [
  ['light', light],
  ['dark', dark],
]) {
  const C = (l, fg, bg, need, kind) => check(name, l, fg, bg, need, kind);

  // --- o produto: texto de transcrição. AAA em toda superfície onde ele pode cair.
  C('TRANSCRIPT sobre surface', T.text, T.surface, AAA, 'texto');
  C('TRANSCRIPT sobre bg', T.text, T.bg, AAA, 'texto');
  C('TRANSCRIPT sobre surface-2', T.text, T.surface2, AAA, 'texto');
  C('TRANSCRIPT sobre surface-3 (bolha)', T.text, T.surface3, AAA, 'texto');
  C('TRANSCRIPT sobre accent-soft (última fala)', T.text, T.accentSoft, AAA, 'texto');

  // --- UI corrente
  C('text-2 sobre surface', T.text2, T.surface, AA, 'texto');
  C('text-2 sobre bg', T.text2, T.bg, AA, 'texto');
  C('text-2 sobre surface-2', T.text2, T.surface2, AA, 'texto');
  C('text-3 (metadado) sobre surface', T.text3, T.surface, AA, 'texto');
  C('text-3 sobre bg', T.text3, T.bg, AA, 'texto');
  C('text-3 sobre surface-2', T.text3, T.surface2, AA, 'texto');
  C('text-3 sobre sidebar-bg', T.text3, T.sidebarBg, AA, 'texto');
  C('text sobre sidebar-bg', T.text, T.sidebarBg, AAA, 'texto');
  C('text-2 sobre sidebar-bg (item inativo)', T.text2, T.sidebarBg, AA, 'texto');

  // --- marca / ação
  C('accent como link sobre surface', T.accent, T.surface, AA, 'texto');
  C('accent como link sobre bg', T.accent, T.bg, AA, 'texto');
  C('accent-text sobre accent (botão primário)', T.accentText, T.accent, AA, 'texto');
  C('accent-text sobre accent-hover', T.accentText, T.accentHover, AA, 'texto');
  C('accent-ink sobre accent-soft (badge)', T.accentInk, T.accentSoft, AA, 'texto');
  C('text sobre sidebar-item-active', T.text, T.sidebarActive, AAA, 'texto');
  C('accent sobre sidebar-item-active (ícone)', T.accent, T.sidebarActive, NT, 'non-text');

  // --- estados (nunca só cor: sempre com ícone + rótulo)
  C('live sobre surface (gravando)', T.live, T.surface, AA, 'texto');
  C('live sobre live-soft', T.live, T.liveSoft, AA, 'texto');
  C('ok sobre surface', T.ok, T.surface, AA, 'texto');
  C('ok sobre ok-soft', T.ok, T.okSoft, AA, 'texto');
  C('warn sobre surface', T.warn, T.surface, AA, 'texto');
  C('warn sobre warn-soft', T.warn, T.warnSoft, AA, 'texto');
  C('danger sobre surface', T.danger, T.surface, AA, 'texto');
  C('danger sobre danger-soft', T.danger, T.dangerSoft, AA, 'texto');

  // --- non-text: foco, bordas, medidor de nível, barra de progresso
  C('foco vs bg', T.focus, T.bg, NT, 'non-text');
  C('foco vs surface', T.focus, T.surface, NT, 'non-text');
  C('foco vs sidebar-bg', T.focus, T.sidebarBg, NT, 'non-text');
  C('border-strong vs surface (input)', T.borderStrong, T.surface, NT, 'non-text');
  C('border-strong vs bg', T.borderStrong, T.bg, NT, 'non-text');
  C('accent-ui (medidor de nível) vs surface', T.accentUi, T.surface, NT, 'non-text');
  C('accent-ui vs surface-2 (trilha do medidor)', T.accentUi, T.surface2, NT, 'non-text');
  // A barra em repouso é o que prova que o medidor existe durante o silêncio:
  // se ela desaparecer na trilha, a pausa passa a parecer painel quebrado.
  C('barra em repouso vs trilha', T.text3, T.surface2, NT, 'non-text');

  // --- separação de superfícies (heurística própria, não WCAG)
  C('surface vs bg', T.surface, T.bg, SEP, 'separação');
  C('surface-2 vs surface', T.surface2, T.surface, SEP, 'separação');
  C('surface-3 vs surface-2', T.surface3, T.surface2, SEP, 'separação');
  C('sidebar-bg vs bg', T.sidebarBg, T.bg, 1.05, 'separação');
  C('BORDA border vs surface', T.border, T.surface, EDGE, 'separação');
  C('BORDA border vs bg', T.border, T.bg, EDGE, 'separação');
}

/* ---------------- o par que PROVA o problema da paleta ---------------- */
console.log('\n########## POR QUE O MIAMI BLUE PURO NÃO PODE SER TEXTO ##########');
console.log(`cyan-500 #00B0DC sobre branco .................. ${r(cyan[500], '#FFFFFF')}:1  -> reprova AA (4.5) e reprova até AA grande (3.0)`);
console.log(`branco sobre cyan-500 (botão preenchido) ....... ${r('#FFFFFF', cyan[500])}:1  -> reprova`);
console.log(`cyan-700 #00728F sobre branco (a correção) ..... ${r(cyan[700], '#FFFFFF')}:1  -> passa AA`);
console.log(`cyan-500 sobre dark surface #16202D ........... ${r(cyan[500], '#16202D')}:1  -> passa AA e quase AAA`);
console.log(`cyan-400 sobre dark surface (o accent do dark) . ${r(cyan[400], '#16202D')}:1  -> passa AAA`);

console.log('\n########## RAMPA MIAMI BLUE ##########');
console.log('passo    hex       vs #FFF    vs light-bg   vs dark-surface  vs dark-bg');
for (const [k, v] of Object.entries(cyan))
  console.log(
    `cyan-${k.padEnd(4)} ${v}  ${String(r(v, '#FFFFFF')).padStart(6)}   ${String(r(v, light.bg)).padStart(6)}      ${String(r(v, dark.surface)).padStart(6)}          ${String(r(v, dark.bg)).padStart(6)}`
  );

console.log('\n########## RAMPA CINZA FRIO ##########');
console.log('passo    hex       vs #FFF    vs dark-bg   vs dark-surface');
for (const [k, v] of Object.entries(grey))
  console.log(
    `grey-${k.padEnd(4)} ${v}  ${String(r(v, '#FFFFFF')).padStart(6)}   ${String(r(v, dark.bg)).padStart(6)}      ${String(r(v, dark.surface)).padStart(6)}`
  );

for (const theme of ['light', 'dark']) {
  console.log(`\n########## TEMA ${theme.toUpperCase()} — ${rows.filter((x) => x.theme === theme).length} pares ##########`);
  for (const row of rows.filter((x) => x.theme === theme))
    console.log(
      `${row.pass ? 'ok  ' : 'FAIL'} ${row.label.padEnd(44)} ${row.fg} / ${row.bg} = ${String(row.v).padStart(6)}  (min ${row.need}, ${row.kind})`
    );
}

const fails = rows.filter((x) => !x.pass);
console.log(`\n>>> ${rows.length - fails.length}/${rows.length} pares passam. FALHAS: ${fails.length}`);
for (const f of fails) console.log(`    ${f.theme}: ${f.label} = ${f.v} < ${f.need}`);
