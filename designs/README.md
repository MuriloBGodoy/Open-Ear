# Pesquisa de design — Open Ear

*Turning sound into sight.*

Índice das sessões de estudo visual. Mantido pelo agente **Michelangelo**.

Cada subpasta representa uma seção/tela do app e contém: briefing, referências
baixadas com link real (`pins/sources.json`), veredito técnico e de acessibilidade,
o artifact (`preview.html`) e os tokens extraídos.

## Contexto que rege todas as decisões

O Open Ear é para **pessoas com deficiência auditiva**. Consequências permanentes:

- Acessibilidade vence estética em qualquer conflito. WCAG 2.2 **AA** mínimo, **AAA** no texto de transcrição.
- O texto **é** o produto, não legenda de apoio. Tipografia é feature.
- Zero feedback exclusivamente sonoro — todo estado precisa de sinal visual/tátil.
- Libras é primeira língua de muitos usuários; português é segunda. Linguagem curta e concreta.
- Uso em conversa real: texto grande, alto contraste, última fala sempre visível.

## Artifact

**[`_design-system/preview.html`](_design-system/preview.html)** — proposta visual
completa, autossuficiente, abre offline. Paleta renderizada, tabela de contraste
recalculada ao vivo nos dois temas, wireframes da sidebar e das 4 telas, as 21
referências analisadas com link de origem, e o veredito ♿.

## Sessões

Sessão de 21/08/2026 — renomeação para Open Ear, migração de abas para sidebar e
nova paleta cinza frio + Miami blue.

| Seção | O que cobre | Refs | Status | Atualizado |
| --- | --- | --- | --- | --- |
| [`_design-system/`](_design-system/) | Paleta Miami blue + cinza frio, navegação, tokens, régua de contraste, artifact | 26 | ✅ decidido e integrado | 21/08/2026 |
| [`transcriber/`](transcriber/) | Transcritor — abas Ao vivo / Arquivo, bolhas, medidor de nível, estados de gravação | 21 | ✅ decidido | 21/08/2026 |
| [`transcriptions/`](transcriptions/) | Transcrições — lista agrupada por recência, busca no texto todo | 12 | ✅ decidido | 21/08/2026 |
| [`library/`](library/) | Biblioteca — áudios em IndexedDB, chips de filtro, drop zone, estados de fila | 12 | ✅ decidido | 21/08/2026 |
| [`settings/`](settings/) | Ajustes — idioma do app / do áudio / região, tamanho de texto, tema | 12 | ✅ decidido | 21/08/2026 |

**83 referências** coletadas ao todo, todas com link real em `pins/sources.json`.
**21** foram abertas e analisadas uma a uma — só essas sustentam decisão e só
essas são citadas.

> **Pinterest: 🔴 não funcionou.** `--source pinterest` foi tentado primeiro em
> todas as queries e devolveu **exit code 4** (exige sessão salva; não existe
> `tools/.pinterest-session.json`). Zero pins do Pinterest neste estudo.
> Registro literal do comando e da saída em
> [`_design-system/README.md`](_design-system/README.md). Para habilitar, rode uma
> vez `node tools/pinterest-login.mjs` e peça a repesquisa.

## O que ficou decidido

- **Paleta:** rampa Miami blue de 11 passos ancorada em `#00B0DC` + rampa cinza
  **frio** (hue ~218). A marca não é um hex — é uma posição na rampa que depende
  do fundo. `cyan-400` no escuro, `cyan-700` para texto no claro, `cyan-600`
  (`--c-accent-ui`) para objeto gráfico no claro (medidor de nível, barra de
  progresso, borda ativa).
- **Tema escuro é o protagonista**; o claro é igualmente validado, para sol na tela.
- **Navegação:** sidebar de 248px com ícone **e** rótulo, gaveta abaixo de 60rem.
  Rail só-ícone e sidebar colapsável foram avaliados e recusados — trade-offs no artifact.
- **Vidro e glow são decoração.** Proibidos atrás de texto de transcrição:
  `backdrop-filter` faz a razão depender do que passa por trás, e 7:1 não se prova
  em fundo variável.
- **84/84 pares** validados por `_design-system/contrast.mjs`.

Detalhes e a justificativa de cada número em
[`_design-system/notes.md`](_design-system/notes.md).

## Backlog de UI/UX

Priorizado por impacto × esforço. Michelangelo mantém esta lista.

| # | Achado | Impacto | Esforço | Situação |
| --- | --- | --- | --- | --- |
| 1 | **Validar com usuário surdo real.** A prova de hoje é matemática de contraste e tamanho; falta gente. É o próximo passo de maior impacto do projeto. | alto | médio | aberto |
| 2 | **Identidade visual definitiva** — logo, ícones PNG 192/512 para PWA/lojas, splash. A paleta existe; a marca ainda não. | alto | médio | aberto |
| 3 | **Onboarding de permissão de microfone** — hoje o erro só aparece depois da negativa. Precisa de tela de preparo antes do prompt do navegador. | alto | baixo | aberto |
| 4 | **Passagem de a11y no código construído** — conferir foco visível, ordem de tabulação, `aria-live` do transcript e rótulo textual em todo estado das 4 telas. | alto | baixo | aberto |
| 5 | **Guarda contra vidro com conteúdo** — `--c-glass-*` só em elemento `aria-hidden`. Vale virar regra de code review. | médio | baixo | aberto |
| 6 | **Diarização** — diferenciar quem fala, quando a API suportar. Precisa de solução que não dependa só de cor. | médio | alto | aberto |
| 7 | **Estados vazio / carregando / erro** desenhados nas 4 telas (documentados nos `notes.md`, ainda não conferidos no app). | médio | baixo | aberto |
| 8 | ~~Paleta de marca acessível~~ — resolvida nesta sessão. | — | — | ✅ feito |
| 9 | ~~Hierarquia da última fala vs. histórico~~ — resolvida: fundo `--c-accent-soft` sólido, sem mudar a métrica de tipo. | — | — | ✅ feito |
