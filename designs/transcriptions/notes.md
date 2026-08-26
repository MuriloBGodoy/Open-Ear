# Transcrições — tokens extraídos

## Linha da lista

| parte | token | razão provada |
| --- | --- | --- |
| título | `--t-md` 17px, peso 600, `--c-text` | 18.02:1 (light) · 15.13:1 (dark) |
| prévia (2 linhas) | `--t-sm` 15px, `--c-text-2` | 9.55:1 · 10.32:1 |
| metadado | `--t-xs` 13px, `--c-text-3` | 6.00:1 · 6.49:1 |
| badge de origem | `--t-xs`, `--c-accent-ink` sobre `--c-accent-soft` | 10.04:1 · 10.13:1 |
| divisória | `1px solid var(--c-border)` | 1.59 vs surface (light) · 1.49 (dark) |

Altura mínima da linha: `--tap` (48px) — na prática ~76px com prévia de 2 linhas.
Padding `--s-3 --s-4`. Hover/focus: fundo `--c-surface-2`, anel `--c-focus` 2px.
A **linha inteira** é o alvo; o `⋮` é um botão separado de 48px dentro dela, com
`aria-label` próprio.

## Agrupamento

Cabeçalho de grupo em `--t-xs` maiúsculo, `--c-text-3`, `letter-spacing: .06em`,
sticky no topo da rolagem. Grupos: Hoje · Ontem · Últimos 7 dias · Mais antigas.
Cabeçalho sticky usa `--c-bg` **opaco** — não translúcido; texto rolando por
trás de um sticky translúcido é o caso clássico de contraste imprevisível.

## Busca

```
height: var(--tap);              /* 48px */
border: 1px solid var(--c-border-strong);   /* 3.31:1 (light) · 3.35:1 (dark) */
border-radius: var(--r-pill);
font-size: var(--t-md);          /* 17px — nunca 13px em campo de entrada */
```

Foco: `outline: 2px solid var(--c-focus); outline-offset: 2px`.
Contador de resultado em `aria-live="polite"`: "3 transcrições encontradas".
Sem esse contador, quem não ouve nem vê animação não sabe se a busca respondeu.

## Estados

| estado | texto (curto e concreto) | ação |
| --- | --- | --- |
| vazio | "Nenhuma transcrição salva ainda." | botão "Começar uma transcrição" |
| carregando | 3 linhas esqueleto `--c-surface-2` + rótulo "Carregando…" | — |
| sem resultado | "Nada encontrado para «xyz»." | "Limpar busca" |
| erro | "Não deu para abrir o histórico." | "Tentar de novo" |

Esqueleto sempre com rótulo textual junto: animação de pulso sozinha não informa
nada a quem tem `prefers-reduced-motion` ativo.
