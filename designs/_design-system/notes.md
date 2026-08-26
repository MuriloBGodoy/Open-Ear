# Design system — Open Ear

> Tokens extraídos. A régua que gerou cada número está em `contrast.mjs`; a saída
> completa em `contrast-report.txt`. **84/84 pares passam.** Rode antes de mexer:
> `node designs/_design-system/contrast.mjs`

---

## 1. O problema, dito em números

O usuário pediu Miami blue (Porsche Miami Blue, `#00B0DC`). Ele é ciano vibrante
e é uma cor de texto ruim sobre claro:

| par | razão | veredito |
| --- | --- | --- |
| `#00B0DC` sobre `#FFFFFF` | **2.55:1** | 🔴 reprova AA (4.5) e reprova o AA de texto grande (3.0) |
| `#FFFFFF` sobre `#00B0DC` | **2.55:1** | 🔴 botão preenchido com rótulo branco é ilegível |
| `#00B0DC` sobre `#FFFFFF` como objeto gráfico | 2.55:1 | 🔴 falha até o non-text 3:1 (WCAG 1.4.11) |

Não é "usar com cuidado". Precisa de rampa. E precisa aceitar que a cor de
marca não é a cor de texto — são funções diferentes do mesmo pigmento.

A saída, provada:

| par | razão | veredito |
| --- | --- | --- |
| `cyan-700 #00728F` sobre `#FFFFFF` | **5.52:1** | ✅ AA — é o ciano-texto do tema claro |
| `cyan-600 #0090B6` sobre `#FFFFFF` | **3.71:1** | ✅ non-text — medidor, barra, borda ativa no claro |
| `cyan-500 #00B0DC` sobre `#16202D` (dark surface) | **6.45:1** | ✅ AA folgado — Miami blue puro vive no escuro |
| `cyan-400 #18BCE4` sobre `#16202D` | **7.31:1** | ✅ **AAA** — accent do tema escuro |

**É por isso que o tema escuro é o protagonista.** Não é moda: é o único lugar
onde a cor que o usuário quer rende sem reprovar. Sobre near-black o ciano
*soma* luz. Sobre branco ele *subtrai* contraste.

---

## 2. Rampa Miami blue — 11 passos

| passo | hex | vs `#FFF` | vs light-bg `#F1F4F9` | vs dark-surface `#16202D` | vs dark-bg `#05080D` | onde se usa |
| --- | --- | --- | --- | --- | --- | --- |
| cyan-50 | `#E8FAFF` | 1.07 | 1.03 | 15.29 | 18.67 | fundo de badge/item ativo (claro) |
| cyan-100 | `#C7F1FC` | 1.21 | 1.09 | 13.62 | 16.63 | superfície de realce (claro) |
| cyan-200 | `#96E5F9` | 1.41 | 1.28 | 11.63 | 14.20 | **texto sobre accent-soft (escuro)** |
| cyan-300 | `#55D2F1` | 1.77 | 1.60 | 9.29 | 11.34 | accent-hover (escuro) |
| cyan-400 | `#18BCE4` | 2.25 | 2.04 | **7.31** | 8.93 | **accent + foco (escuro)** |
| **cyan-500** | **`#00B0DC`** | **2.55** 🔴 | 2.31 🔴 | 6.45 | 7.87 | **âncora de marca**; medidor de nível (escuro) |
| cyan-600 | `#0090B6` | 3.71 | 3.36 | 4.43 | 5.41 | **non-text (claro)**: medidor, barra, borda ativa |
| cyan-700 | `#00728F` | **5.52** | 5.01 | 2.97 | 3.63 | **accent + foco (claro)** |
| cyan-800 | `#0A5A70` | 7.75 | 7.03 | 2.12 | 2.59 | accent-hover (claro) |
| cyan-900 | `#0E4353` | 10.79 | 9.79 | 1.52 | 1.86 | texto sobre accent-soft (claro) |
| cyan-950 | `#082B36` | 14.90 | 13.52 | 1.10 | 1.35 | tinta em ornamento/gradiente |

**Regra que sai daí, em uma linha:** o ciano é *claro* no tema escuro e *escuro*
no tema claro. A marca não é um hex — é uma posição na rampa que depende do fundo.

---

## 3. Rampa cinza — frio, hue ~218

**Decisão e justificativa:** cinza **frio**, não neutro. Dois motivos concretos.
(1) Contraste simultâneo: cinza neutro encostado em ciano saturado é lido como
bege sujo — o olho compensa a cor vizinha. (2) O frio deixa o ciano parecer mais
saturado sem gastar um ponto de razão de contraste, o que é exatamente o negócio
que queremos fazer aqui. O custo é que fotos e miniaturas de áudio ficam
levemente mais frias; aceitável, não temos conteúdo de pele/comida.

| passo | hex | vs `#FFF` | vs dark-bg `#05080D` | vs dark-surface `#16202D` |
| --- | --- | --- | --- | --- |
| grey-0 | `#FFFFFF` | 1.00 | 20.06 | 16.42 |
| grey-25 | `#F7F9FC` | 1.05 | 19.02 | 15.57 |
| grey-50 | `#F1F4F9` | 1.10 | 18.19 | 14.90 |
| grey-100 | `#E6EBF2` | 1.20 | 16.74 | 13.71 |
| grey-200 | `#D4DBE5` | 1.39 | 14.39 | 11.78 |
| grey-300 | `#B5BFCD` | 1.86 | 10.79 | 8.84 |
| grey-400 | `#838EA0` | **3.31** | 6.06 | 4.96 |
| grey-500 | `#697585` | 4.68 | 4.28 | 3.51 |
| grey-600 | `#4F5A69` | 7.00 | 2.86 | 2.35 |
| grey-700 | `#39424F` | 10.16 | 1.97 | 1.62 |
| grey-800 | `#242C37` | 14.09 | 1.41 | 1.16 |
| grey-900 | `#151B23` | 17.31 | 1.14 | — |
| grey-950 | `#0C1118` | 18.94 | 1.05 | — |
| grey-1000 | `#05080D` | 20.06 | 1.00 | — |

grey-400 é o piso de `border-strong`: 3.31:1 sobre branco, ou seja passa o
non-text 3:1 com folga mínima mas real. grey-500 (4.68) seria o piso de texto
AA — não uso, porque `--c-text-3` precisa também funcionar sobre `surface-2`.

---

## 4. Tokens semânticos

### Tema claro

| token | hex | par provado | razão | meta |
| --- | --- | --- | --- | --- |
| `--c-bg` | `#F1F4F9` | — | — | página |
| `--c-surface` | `#FFFFFF` | vs bg | 1.10 | cartão (aresta vem da borda, não da luminância) |
| `--c-surface-2` | `#E6EBF2` | vs surface | 1.20 | bloco embutido |
| `--c-surface-3` | `#D4DBE5` | text sobre ele | **15.04** | bolha de fala |
| `--c-border` | `#C4CEDC` | vs surface / vs bg | 1.59 / 1.44 | aresta percebida nos dois |
| `--c-border-strong` | `#838EA0` | vs surface | **3.31** | ✅ non-text 3:1 |
| `--c-text` | `#101720` | sobre surface / bg / surface-2 | **18.02 / 16.34 / 15.04** | ✅ AAA — transcript |
| `--c-text-2` | `#3D4653` | sobre surface / bg | 9.55 / 8.66 | ✅ AAA |
| `--c-text-3` | `#5A6472` | sobre surface / bg / surface-2 | 6.00 / 5.44 / **5.01** | ✅ AA — só metadado |
| `--c-accent` | `#00728F` | sobre surface / bg | 5.52 / 5.01 | ✅ AA |
| `--c-accent-hover` | `#0A5A70` | branco sobre ele | 7.75 | ✅ AAA |
| `--c-accent-text` | `#FFFFFF` | sobre accent | 5.52 | ✅ AA |
| `--c-accent-soft` | `#E8FAFF` | accent-ink sobre ele | 10.04 | ✅ AAA |
| `--c-accent-ink` | `#0E4353` | — | — | tinta de badge |
| `--c-accent-ui` | `#0090B6` | vs surface / vs surface-2 | 3.71 / **3.09** | ✅ non-text. **Nunca texto.** |
| `--c-focus` | `#00728F` | vs bg / vs sidebar-bg | 5.01 / 5.23 | ✅ non-text folgado |
| `--c-sidebar-bg` | `#F7F9FC` | vs bg | 1.05 | distingue sem virar 2ª página |
| `--c-sidebar-item-active` | `#E8FAFF` | text sobre ele | **16.77** | ✅ AAA |
| `--c-live` | `#B3183F` | sobre surface / branco sobre ele | 6.73 / 6.73 | ✅ AA |
| `--c-live-soft` | `#FDEBF0` | live sobre ele | 5.87 | ✅ AA |
| `--c-ok` | `#0A6A4A` | sobre surface / ok-soft | 6.62 / 5.86 | ✅ AA |
| `--c-warn` | `#7E4E00` | sobre surface / warn-soft | 7.05 / 6.36 | ✅ AAA / AA |
| `--c-danger` | `#AF2318` | sobre surface / danger-soft | 6.83 / 5.97 | ✅ AA |

### Tema escuro

| token | hex | par provado | razão | meta |
| --- | --- | --- | --- | --- |
| `--c-bg` | `#05080D` | — | — | near-black azulado (da referência) |
| `--c-surface` | `#16202D` | vs bg | 1.22 | cartão se separa da página |
| `--c-surface-2` | `#243141` | vs surface | 1.24 | bloco embutido |
| `--c-surface-3` | `#303F53` | text sobre ele | **10.65** | bolha de fala |
| `--c-border` | `#2F3D50` | vs surface / vs bg | 1.49 / 1.82 | a "borda fina luminosa" da referência |
| `--c-border-strong` | `#637286` | vs surface / vs bg | **3.35** / 4.09 | ✅ non-text 3:1 |
| `--c-text` | `#F2F6FB` | surface / bg / surface-2 / surface-3 | **15.13 / 18.48 / 12.99 / 10.65** | ✅ AAA — transcript |
| `--c-text-2` | `#C4CEDB` | surface / bg / surface-2 | 10.32 / 12.61 / 8.86 | ✅ AAA |
| `--c-text-3` | `#98A4B4` | surface / bg / surface-2 | 6.49 / 7.93 / **5.22** | ✅ AA — só metadado |
| `--c-accent` | `#18BCE4` | surface / bg / surface-2 | **7.31** / 8.93 / 7.04 | ✅ **AAA** |
| `--c-accent-hover` | `#55D2F1` | accent-text sobre ele | 9.36 | ✅ AAA |
| `--c-accent-text` | `#04222B` | sobre accent | 7.37 | ✅ AAA |
| `--c-accent-soft` | `#0B2E3B` | text sobre ele / accent sobre ele | **13.18** / 6.37 | ✅ AAA |
| `--c-accent-ink` | `#96E5F9` | sobre accent-soft | 10.13 | ✅ AAA |
| `--c-accent-ui` | `#00B0DC` | vs surface / vs surface-2 | 6.45 / 5.18 | ✅ Miami blue puro pode aqui |
| `--c-focus` | `#18BCE4` | vs bg / surface / sidebar-bg | 8.93 / 7.31 / 8.55 | ✅ non-text folgadíssimo |
| `--c-sidebar-bg` | `#0E1520` | vs bg | 1.10 | assenta, não flutua |
| `--c-sidebar-item-active` | `#0B2E3B` | text / accent sobre ele | 13.18 / 6.37 | ✅ AAA |
| `--c-live` | `#FF9DB4` | surface / live-soft | 8.39 / 8.16 | ✅ AAA |
| `--c-ok` | `#5FD3A3` | surface / ok-soft | 8.86 / 8.28 | ✅ AAA |
| `--c-warn` | `#E8B058` | surface / warn-soft | 8.43 / 8.08 | ✅ AAA |
| `--c-danger` | `#FF9F94` | surface / danger-soft | 8.32 / 8.11 | ✅ AAA |

---

## 5. Glass e glow — onde entram e onde estão proibidos

A referência de imagem é uma landing de marketing. O clima é adotável; a
mecânica, não inteiramente. Fronteira explícita:

| efeito | ✅ permitido | 🔴 proibido |
| --- | --- | --- |
| `--c-glass-bg` / `--c-glass-border` | cartão decorativo, painel de métrica, ornamento vazio | **atrás de qualquer texto de transcrição.** Translúcido + `backdrop-filter` faz a razão de contraste depender do que passa por trás — fica imprevisível. Não se pode provar 7:1 num fundo que muda. |
| `--shadow-glow` | botão primário, item ativo da sidebar, anel do medidor de nível — estados **interativos** | decoração permanente de tela; halo atrás de bloco de leitura |
| `--c-glow` | gradiente radial de fundo em área vazia, `aria-hidden` | qualquer coisa sob texto |
| tipografia display com gradiente prateado | `--t-3xl` em título de tela | corpo, rótulo, metadado, transcript |
| ornamento 3D iridescente | SVG/CSS leve, `aria-hidden`, canto vazio | asset raster pesado; qualquer coisa que dispute atenção com a leitura |

Em `prefers-contrast: more` o vidro fica **opaco**, o glow vira **transparente**
e `--shadow-glow` se torna um anel sólido de foco. Quem pede contraste recebe
contraste, não um efeito diferente.

---

## 6. Forma, ritmo e layout

| token | valor | motivo |
| --- | --- | --- |
| `--r-sm/md/lg/xl` | 10 / 14 / 20 / 28px | raio generoso é o que a referência dá de graça; escala em ~1.4× |
| `--s-1…8` | 4→64px | escala 4px; `--s-8` (64) abre respiro de seção e área de ornamento |
| `--t-transcript` | 22px, piso 18px | controlado pelo usuário em runtime |
| `--lh-transcript` | **1.65** | a pessoa alterna olhar tela↔rosto; entrelinha folgada devolve o lugar na volta |
| `--t-xs` | 13px | **só** duração/tamanho de arquivo. Nunca conteúdo. |
| `--sidebar-w` | 248px | 24 ícone + 12 gap + rótulo + folga; caberia i18n em alemão |
| `--sidebar-w-rail` | 76px | alvo de 48px centrado com 14 de cada lado |
| `--content-max` | 920px | ~70ch em 22px — medida de leitura, não largura de tela |
| `--tap` | **48px** | WCAG 2.2 SC 2.5.8 pede 24; subimos por decisão de a11y |

## 7. Tipografia

`system-ui` continua. Não é preguiça: fonte de sistema é a única que já vem com
o ajuste de tamanho do SO respeitado, chega em 0 KB (importa num PWA que roda em
conversa real, possivelmente em 3G) e tem cobertura de acentuação PT-BR e dos
idiomas do i18n sem subset. Uma display para o `--t-3xl` é a única troca que
valeria discutir — e só se vier com `font-display: swap` e peso único.
