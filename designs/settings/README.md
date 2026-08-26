# `settings` — Ajustes (idioma/região, tamanho do texto, tema)

## Briefing

Três coisas, e uma delas é a mais importante do app depois do próprio transcript:
**tamanho do texto**. Nesta seção o controle não é "preferência", é acessibilidade
executada pelo usuário. Idioma/região alimenta o i18n e o idioma de captação.
Tema decide entre escuro (protagonista) e claro (rua ensolarada).

Regra que vale para toda a tela: **prévia ao vivo**. Um seletor de tamanho de
texto sem amostra do texto real é adivinhação.

## Pesquisa

**Pinterest: 🔴 exit 4** — sem sessão salva (detalhe em `../_design-system/README.md`).
Nenhum pin citado. Segui com Dribbble.

| query (`--source dribbble`) | pasta | coletados |
| --- | --- | --- |
| `settings screen language selector ui` | `pins/settings-screen-language-selector-ui/` | 6 |
| `accessibility settings text size app ui` | `pins/accessibility-settings-text-size-app-ui/` | 6 |

12 referências. Links reais em `pins/sources.json`.

## Veredito por referência

Só as que abri com `Read`.

### [Accessible News — Profile Page](https://dribbble.com/shots/26642316-Accessible-News-Profile-Page)
`pins/accessibility-settings-text-size-app-ui/05--…jpg` · ✅ nativo · ♿ ✅ passa

A melhor referência da seção, e é a que se propõe a ser acessível de fato. Linhas
de ajuste como **cartões chapados empilhados**, cada uma com rótulo à esquerda e
**valor à direita** ("Language ··· English") ou toggle. Sem ícone decorativo, sem
chevron minúsculo: a linha é larga, o texto é grande, o valor atual está visível
sem abrir nada. Azul forte de verdade no botão primário.
♿ ✅ passa: texto escuro sobre superfície clara sólida, alvos generosos.
**Adotado como a anatomia da linha de ajuste.** Único ajuste nosso: o toggle
ganha rótulo de estado textual ao lado ("Ligado"/"Desligado") — a posição do
polegar sozinha é um sinal frágil, e em `prefers-contrast: more` fica pior.

### [Voice Recording & Transcription App — tela de Settings](https://dribbble.com/shots/27085875-Voice-Recording-Transcription-App-Design)
`../transcriber/pins/transcription-app-interface-clean/05--…jpg` · ✅ nativo · ♿ 🟡 parcial

Reaproveitada do Transcritor. A terceira tela é um Ajustes com **grupos
rotulados** ("General Settings"), linhas com ícone + rótulo + valor à direita
(`Language ··· English (US) ›`) e toggles. Confirma o agrupamento e o padrão
"valor à direita, sempre visível".
♿ 🟡 rótulo secundário sob o principal em ~11px cinza-claro. **Correção:** a
descrição de apoio vai para `--t-sm` 15px `--c-text-2` (9.55:1) — e ela é onde a
frase concreta explica o ajuste, então não pode ser o texto mais fraco da tela.

### [HelloUI Design System for SaaS](https://dribbble.com/shots/27046172-HelloUI-Design-System-for-SaaS-Enterprise-Products)
`pins/settings-screen-language-selector-ui/06--…jpg` · 🔴 fora do alcance · ♿ 🔴 reprova

Capa de kit de design: roxo saturado de ponta a ponta, chips claros com rótulo
roxo, tipografia display gigante. Não é uma tela de ajustes — é arte de capa.
Zero componente aproveitável.
🔴 / ♿ 🔴 os chips claros com texto roxo sobre fundo roxo saturado ficam abaixo de
AA, e a paleta monocromática não tem escala neutra para hierarquia de texto.
Registrado apenas para não parecer que descartei em silêncio.

## Decisão

- **Anatomia da linha:** rótulo (17px) + descrição concreta (15px) à esquerda,
  controle/valor à direita, altura mínima 64px. (Accessible News + Wavelogs)
- **Três grupos rotulados:** `Leitura` · `Idioma e região` · `Aparência`.
  "Leitura" vem primeiro porque tamanho de texto é o ajuste de maior impacto.
- **Tamanho do texto:** grupo de botões de rádio segmentado (18 · 22 · 26 · 32 ·
  40px) com **prévia ao vivo** logo abaixo, mostrando uma frase de transcrição
  real. Não é slider: slider não dá valor discreto nem alvo confortável, e o
  usuário precisa poder voltar ao valor exato de ontem.
- **Idioma e região:** três controles separados — idioma **do app**, idioma **do
  áudio** e **região**. Não são a mesma coisa: a pessoa pode usar a UI em
  português, legendar uma reunião em inglês e querer data/hora no formato de
  Portugal. Valor atual sempre visível em cada um.
- **Tema:** três estados (Claro · Escuro · Do sistema), como rádio, não toggle.
  Toggle de duas posições não consegue expressar "siga o sistema".
- **Toggle sempre com rótulo de estado textual** ao lado.
- Sem "salvar": ajuste aplica na hora, com confirmação em `aria-live="polite"`.

Renderizado no artifact em miniatura; detalhamento fino quando o dono do código
pedir.
