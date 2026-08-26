# Transcritor — tokens extraídos

## Hierarquia (a decisão mais importante da tela)

Três níveis, e o olho tem que acertar qual é qual em menos de um segundo:

| nível | o que é | tokens |
| --- | --- | --- |
| 1 | **última fala** | `--t-transcript` (22px, user-controlled) · `--c-text` · fundo `--c-accent-soft` sólido · `--r-lg` · padding `--s-4 --s-5` |
| 2 | falas anteriores | `--t-transcript` · `--c-text` · fundo `--c-surface-3` sólido · mesma forma |
| 3 | metadado (hora, "transcrevendo…") | `--t-xs` 13px · `--c-text-3` · acima da bolha, nunca dentro |

A última fala usa **cor de fundo**, não tamanho de fonte, para se destacar.
Aumentar a fonte da última fala reflui o layout a cada segmento novo e faz o
texto pular — inaceitável em leitura contínua.

## Bolha de fala

```
background: var(--c-surface-3);   /* SÓLIDO. 10.65:1 (dark) · 15.04:1 (light) */
color: var(--c-text);
border-radius: var(--r-lg);
padding: var(--s-4) var(--s-5);
max-width: 62ch;                  /* medida de leitura, não largura do container */
font-size: var(--t-transcript);
line-height: var(--lh-transcript);
```

Última fala: troca `background` para `var(--c-accent-soft)` e ganha
`box-shadow: var(--shadow-glow)` — o único glow da tela, e ele marca *estado*,
não decora. Em `prefers-contrast: more` vira anel sólido de foco.

**Proibido aqui:** `backdrop-filter`, `opacity < 1`, gradiente no fundo da bolha,
`--c-glass-bg`. Não se prova 7:1 num fundo translúcido.

## Medidor de nível — a prova visual de captação

O §0 proíbe feedback exclusivamente sonoro. A pessoa não confirma pelo ouvido que
o microfone pegou, então o medidor não é enfeite: é o indicador de funcionamento.

| parte | token | razão |
| --- | --- | --- |
| barra ativa | `--c-accent-ui` | 6.45:1 vs surface (dark) · 3.71:1 (light) → passa non-text 3:1 |
| trilha | `--c-surface-2` | — |
| rótulo de estado | `--t-sm` · `--c-text-2` | "Captando", "Silêncio", "Sem sinal" |

12 barras, altura 8→28px, `--r-pill`, gap `--s-1`. **Sempre acompanhado de
rótulo textual** — barra parada e barra ausente parecem a mesma coisa para quem
não conhece o padrão. Sob `prefers-reduced-motion` as barras param de animar e o
rótulo passa a ser o sinal principal.

## Estado de gravação

| estado | cor | ícone | rótulo | tátil |
| --- | --- | --- | --- | --- |
| parado | `--c-text-2` | microfone | "Começar" | — |
| gravando | `--c-live` | ponto sólido | "Gravando · 00:32" | vibração curta ao iniciar |
| pausado | `--c-warn` | pause | "Pausado" | — |
| transcrevendo | `--c-accent` | — | "Transcrevendo…" | — |
| erro | `--c-danger` | alerta | frase concreta e curta | vibração dupla |

Nunca só cor. Sempre ícone + rótulo. Vocabulário curto e concreto (§0): "Começar",
não "Iniciar captura de áudio".

## Controles

| controle | tamanho | tokens |
| --- | --- | --- |
| botão primário (Começar/Parar) | altura 56px, `--r-pill` | `--c-accent` / `--c-live` + `--c-accent-text` · `--shadow-glow` |
| pause | `--tap` 48px, `--r-pill` | `--c-surface-2` · borda `--c-border-strong` (3.35:1) |
| chip de idioma | altura 40px, `--r-pill` | `--c-surface-2` · `--t-sm` · seta indicando menu |
| enviar arquivo | altura 48px, `--r-md` | secundário: borda `--c-border-strong`, texto `--c-text` |

Todos ≥ 48px de alvo. Botão primário com rótulo textual **ao lado** do ícone, não
tooltip — o §0 pede ícone que carregue significado junto do rótulo.

## Layout

| breakpoint | forma |
| --- | --- |
| ≥ 1024px | Opção B: transcript (`--content-max` 920px) + coluna de 300px com medidor/timer/ações |
| 640–1023px | Opção A: transcript pleno + barra inferior fixa de controles |
| < 640px | Opção A + sidebar vira barra inferior de 4 itens; transcript ganha a tela toda |

Âncora de scroll na última fala: `scroll-margin-block-end: var(--s-6)` e scroll
programático só quando o usuário já está no fim da lista (se ele rolou para
trás para reler, não arrancar a página dele).

## Ornamento

Um único gradiente radial `--c-glow` atrás do topo da coluna de estado,
`aria-hidden="true"`, ~0 KB (CSS puro). Some em `prefers-contrast: more`.
Nada de asset 3D raster: num PWA usado em conversa real, peso de download é
problema de acessibilidade também.
