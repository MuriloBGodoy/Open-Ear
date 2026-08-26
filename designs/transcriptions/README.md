# `transcriptions` — Transcrições (arquivo/histórico com busca)

## Briefing

Onde a pessoa volta para reler o que foi dito. Lista de transcrições salvas
(IndexedDB, local), com busca. O valor está em **reencontrar rápido**: a busca
precisa achar no corpo do texto, não só no título, porque ninguém batiza uma
conversa no momento em que ela acontece.

## Pesquisa

**Pinterest: 🔴 exit 4** — sem sessão salva (detalhe em `../_design-system/README.md`).
Nenhum pin citado. Segui com Dribbble.

| query (`--source dribbble`) | pasta | coletados |
| --- | --- | --- |
| `search list archive ui dark app` | `pins/search-list-archive-ui-dark-app/` | 6 |
| `notes history list search ui` | `pins/notes-history-list-search-ui/` | 6 |

12 referências. Links reais em `pins/sources.json`.

## Veredito por referência

Só as que abri com `Read`.

### [AI Tool Mobile App — All Conversations Screen](https://dribbble.com/shots/26815579-AI-Tool-Mobile-App-All-Conversations-Screen-Design)
`pins/search-list-archive-ui-dark-app/02--…jpg` · ✅ nativo · ♿ 🔴 reprova

O padrão certo para o nosso caso: título de tela, **busca logo abaixo** (não
escondida atrás de lupa), e a lista **agrupada por recência** com cabeçalho de
grupo ("Previous 7 Days"). Agrupar por tempo é o que faz "aquela conversa de
terça" ser achável sem lembrar o nome. Adotado.
♿ 🔴 reprova: o mockup está em perspectiva e o texto real é ~11–13px em cinza
sobre near-black, com a descrição em duas linhas truncadas quase ilegíveis.
**Correções adotadas:** título da linha em `--t-md` 17px `--c-text`, prévia em
`--t-sm` 15px `--c-text-2` (10.32:1), metadado em `--t-xs` 13px `--c-text-3`.
Também recusei o chevron `›` como única affordance — a linha inteira é o alvo,
com `--tap` 48px de altura mínima.

### [Notes App](https://dribbble.com/shots/25703316-Notes-App)
`pins/notes-history-list-search-ui/03--…jpg` · 🟡 composição · ♿ 🔴 reprova

Grade de cartões de nota com **busca larga + botão de filtro ao lado**, e blocos
tipo "Quick Notes" com prévia do conteúdo dentro do cartão. A prévia do conteúdo
no cartão é o ponto: numa transcrição, as duas primeiras linhas *são* o título
útil. Adotado como prévia de 2 linhas com `line-clamp`.
♿ 🔴 serifada de ~11px em cor média sobre branco, e o layout depende de
ilustração autoral. Descartei a grade em favor de lista: em ferramenta de uso
contínuo a lista dá mais itens por rolagem e uma medida de leitura melhor para
prévia de texto corrido.

### [Dark Mode Dashboard Cards — Activity & Notifications](https://dribbble.com/shots/26409524-Dark-Mode-Dashboard-Cards-Activity-Notifications)
`../_design-system/pins/glassmorphism-dashboard-cards-dark/02--…jpg` · ✅ nativo · ♿ 🟡 parcial

Reaproveitada do `_design-system`: anatomia de linha (badge de ícone + título +
descrição + timestamp + `⋮`) e segmentado no topo. O segmentado virou filtro
"Todas / Ao vivo / De arquivo". Divisórias hairline em vez de cartão por item.
♿ 🟡 estado comunicado só por cor. **Correção:** ícone + rótulo sempre.

## Decisão

- **Lista**, não grade. Mais itens por rolagem, prévia de texto com medida melhor.
- **Agrupamento por recência** com cabeçalho de grupo (Hoje · Ontem · Últimos 7
  dias · Mais antigas). Vem do "All Conversations".
- **Busca sempre visível** no topo, `--tap` 48px, com contador de resultado em
  `aria-live="polite"` — quem não ouve não recebe o "achei" de nenhum outro jeito.
- **Anatomia da linha:** título (17px) · prévia de 2 linhas (15px) · metadado
  (13px: data · duração · origem ao vivo/arquivo). Linha inteira clicável.
- **Estados vazio / carregando / sem resultado** desenhados, com frase curta e
  concreta e uma ação óbvia ("Começar uma transcrição").

Renderizado no artifact em miniatura; o detalhamento fino sai quando o dono do
código pedir — a tela crítica desta rodada é o Transcritor.
