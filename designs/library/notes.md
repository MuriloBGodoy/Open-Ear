# Biblioteca — tokens extraídos

## Linha de arquivo

```
min-height: 72px;                         /* > --tap 48px */
padding: var(--s-3) var(--s-4);
border-bottom: 1px solid var(--c-border);
display: grid;
grid-template-columns: 44px 1fr auto auto; /* ícone · nome+meta · estado · ação */
gap: var(--s-3);
align-items: center;
```

| parte | token | razão |
| --- | --- | --- |
| ícone de tipo | 44px, `--c-accent` sobre `--c-accent-soft`, `--r-md` | 6.37:1 (dark) → non-text folgado |
| nome do arquivo | `--t-md` 17px, 600, `--c-text` | 18.02 / 15.13 |
| `duração · tamanho · data` | `--t-xs` 13px, `--c-text-3` | 6.00 / 6.49 |
| ação "Transcrever" | altura 40px, `--r-pill`, `--c-accent` + `--c-accent-text` | 5.52 / 7.37 |
| `⋯` | 48px, `aria-label="Mais ações"` | — |

## Badges de estado — cor nunca é o único sinal

| estado | fundo / texto | ícone | rótulo |
| --- | --- | --- | --- |
| guardado | `--c-surface-2` / `--c-text-2` | arquivo | "Guardado" |
| na fila | `--c-warn-soft` / `--c-warn` | relógio | "Na fila" |
| transcrevendo | `--c-accent-soft` / `--c-accent-ink` | — + barra de progresso | "Transcrevendo 40%" |
| pronto | `--c-ok-soft` / `--c-ok` | check | "Pronto" |
| erro | `--c-danger-soft` / `--c-danger` | alerta | frase curta |

Todos os pares provados em `../_design-system/contrast-report.txt` (≥5.86:1 no
claro, ≥8.08:1 no escuro). Ícone + rótulo em todos: quem não distingue verde de
vermelho, ou quem está no sol, ainda lê o estado.

## Chips de filtro

```
height: 40px;  border-radius: var(--r-pill);  font-size: var(--t-sm);
/* inativo */ background: transparent; border: 1px solid var(--c-border-strong); color: var(--c-text-2);
/* ativo   */ background: var(--c-accent-soft); color: var(--c-accent-ink); font-weight: 650; border-color: transparent;
```

`aria-pressed` obrigatório. O peso de fonte muda junto com a cor — o estado ativo
não pode depender de percepção cromática.

## Zona de largar arquivo

Contorno tracejado `2px dashed var(--c-border-strong)` (3.31 / 3.35 → non-text
ok), `--r-lg`, `--c-surface-2` de fundo. Dentro: ícone, frase curta ("Arraste
áudios aqui") e **um botão real** "Escolher arquivos" de 48px. Arrastar é atalho,
nunca requisito. `dragover`: borda `--c-accent-ui`, fundo `--c-accent-soft`.

## Barra de pré-escuta

`--c-surface-2` **sólido**, borda superior `--c-border`, ancorada no rodapé do
painel. Play/pause 48px, nome do arquivo `--t-sm`, tempo `--t-xs` tabular,
trilha de progresso `--c-surface-3` com preenchimento `--c-accent-ui` (≥3:1).
Sem `backdrop-filter` — o que rola por trás mudaria o contraste do nome.

Pré-escuta é conveniência para audição residual e conferência de arquivo. Nome +
duração + data identificam o item sem depender dela.
