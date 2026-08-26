# `transcriber` — Transcritor (legenda ao vivo + arquivo)

## Briefing

A tela principal, e não por pouco: é onde a pessoa **conversa**. Duas entradas
(microfone ao vivo, arquivo enviado) e uma saída só — texto que precisa ser lido
de relance, alternando o olhar entre a tela e o rosto de quem fala. Tudo aqui é
subordinado a isso: a última fala sempre visível sem rolar, 22px de piso, 7:1 de
contraste, e prova visual de captação de áudio (medidor de nível) porque a
pessoa não pode confirmar pelo ouvido que o microfone está pegando.

## Pesquisa

**Pinterest: 🔴 exit 4** — sem sessão salva, bloqueado (detalhe em
`../_design-system/README.md`). Nenhum pin citado. Segui com Dribbble.

| query (`--source dribbble`) | pasta | coletados |
| --- | --- | --- |
| `live caption ui` | `pins/live-caption-ui/` | 7 |
| `transcription app interface clean` | `pins/transcription-app-interface-clean/` | 7 |
| `high contrast accessible app large type` | `pins/high-contrast-accessible-app-large-type/` | 7 |

21 referências. Links reais em `pins/sources.json`.

## Veredito por referência

Só as que abri com `Read`.

### [Live Transcript AI Assistant App](https://dribbble.com/shots/27580453-Live-Transcript-AI-Assistant-App)
`pins/transcription-app-interface-clean/01--…jpg` · ✅ nativo · ♿ 🔴 reprova no que importa

A referência mais próxima do nosso caso: transcript ao vivo como **bolhas
alternadas** (esquerda/direita por falante), separador de data no topo, indicador
`•••` de "transcrevendo", cluster de controles embaixo (pause · **stop grande
central** · extra) com o timer acima. O stop vermelho no header, sempre
alcançável, é bom e foi adotado.
♿ 🔴 reprova exatamente onde não pode: as bolhas do transcript são cinza-claro
ou branco sobre branco-acinzentado, texto de ~14px. É o produto inteiro em
contraste ruim. **Correções adotadas:** bolha usa `--c-surface-3` sólido
(10.65:1 no escuro, 15.04:1 no claro), texto em `--t-transcript` 22px, última
fala em `--c-accent-soft` sólido — nunca translúcido.
Também recusei o `•••` como único sinal de processamento: pending ganha rótulo
textual ("transcrevendo…") + `aria-live`.

### [Voice Recording & Transcription App (Wavelogs)](https://dribbble.com/shots/27085875-Voice-Recording-Transcription-App-Design)
`pins/transcription-app-interface-clean/05--…jpg` · ✅ nativo · ♿ 🟡 parcial

Três telas de uma vez e todas úteis. (1) Painel de gravação com **timer enorme**
e forma de onda viva — a prova visual de captação que o §0 exige. (2) Bloco
rotulado `LIVE TRANSCRIPTION` separado do painel de gravação, o que resolve
nossa hierarquia: *estado da captura* e *texto capturado* são dois blocos, não
um. (3) Par **Pause / Stop** explícito, com "Stop" preenchido e escuro.
♿ 🟡 o texto ao vivo é ~15px cinza-médio; o rótulo `LIVE TRANSCRIPTION` tem
~10px. **Correção:** o texto sobe para 22px e o rótulo para 13px `--c-text-3`.
Adotei a forma de onda como **medidor de nível em barras** (`--c-accent-ui`,
6.45:1 no escuro), não como decoração: barras que não se movem = microfone mudo,
e isso precisa ser óbvio.

### [Empowering Health Care Mobile App — Chat Screen](https://dribbble.com/shots/26099457-Empowering-Health-Care-Mobile-App-Chat-Screen)
`pins/high-contrast-accessible-app-large-type/04--…jpg` · ✅ nativo · ♿ ✅ passa

O melhor contraste do lote inteiro: bolha **escura sólida com texto branco** de
um lado, bolha clara sólida do outro. Sem gradiente, sem vidro, sem opacidade.
É exatamente a mecânica que o transcript precisa. Também tem o cluster de voz
que adotei: mic circular grande no centro, `×` (descartar) e enviar nas
laterais, timer e forma de onda acima.
♿ ✅ passa; o único ajuste é o timestamp de 11px → 13px.

### [Orex — AI Live Translation Mobile App](https://dribbble.com/shots/27384945--Orex-Premium-AI-Live-Translation-Mobile-App-UI)
`pins/live-caption-ui/01--…jpg` · 🟡 composição · ♿ 🔴 reprova

Legenda/tradução ao vivo com um seletor de idioma **em linha no topo**
("Primary Language: English ⌄"). Isso resolve um problema real do nosso i18n: o
idioma de captação muda no meio da conversa e não pode exigir ida a Ajustes.
Adotado como chip de idioma no header do Transcritor.
♿ 🔴 o resto reprova: paleta laranja-sobre-creme quase sem contraste, rótulos
de 11px, e a tela é uma grade de atalhos de marketing. Não é ferramenta de uso
contínuo — é primeira dobra. Descartado como layout.

### [Cloome — Smart Meeting SaaS Dashboard](https://dribbble.com/shots/26214421-Cloome-Smart-Meeting-SaaS-Dashboard-with-AI-Integration)
`pins/live-caption-ui/02--…jpg` · ✅ nativo · ♿ 🟡 parcial

Referência de **desktop com sidebar**, tema claro: grupos rotulados, item ativo
com pílula tingida suave, e um painel de conteúdo em duas colunas (principal
grande + lateral de apoio). Confirma a proporção que usei no Transcritor em tela
larga: transcript dominante + coluna estreita de controles/estado.
♿ 🟡 metadado de 11px e roxo saturado com texto branco no limite. A pílula do
item ativo eu adotei, com `--c-accent-soft` (16.77:1 para o rótulo).

### [Lumenix — Voice Assistant Hub](https://dribbble.com/shots/27551563-Lumenix-Intelligent-Voice-Assistant-Hub-Behavioral-Analytics)
`pins/transcription-app-interface-clean/06--…jpg` · 🟡 composição · ♿ 🔴 reprova

Player de áudio com forma de onda + velocidade de reprodução (`Speed 1x`) e
download — útil para a **transcrição de arquivo**, onde a pessoa pode querer
reouvir/reprocessar. Adotei só a barra de ações do resultado.
♿ 🔴 é um mockup em perspectiva sobre monitor, densidade de dashboard analítico
com fonte de ~10–11px. Reprova em tudo, e o domínio (analytics de emoção) não é
o nosso. Inspiração parcial.

## Decisão

Duas opções no artifact, ambas com o mesmo transcript:

- **A — Foco total.** Transcript ocupa a tela; controles em barra inferior fixa.
- **B — Transcript + coluna de estado.** Transcript dominante à esquerda, coluna
  estreita à direita com medidor de nível, timer, idioma e ações.

Recomendação: **B em ≥1024px, colapsando em A abaixo disso.** Racional no
artifact (`../_design-system/preview.html`).

Padrões fechados, independentes da opção:

1. **Última fala destacada** em `--c-accent-soft` sólido, com âncora de scroll —
   nunca sai de vista. (Analytics Dashboard AI + Live Transcript)
2. **Medidor de nível em barras**, `--c-accent-ui`, com rótulo de estado ao lado.
   É a prova visual de captação. (Wavelogs)
3. **Bolha sólida**, nunca translúcida. (Health Care Chat)
4. **Par Pause/Parar** com alvo de 48px+ e rótulo textual, não só ícone. (Wavelogs)
5. **Chip de idioma** no header, alcançável sem sair da tela. (Orex)
6. `aria-live="polite"` no transcript; `pending` com rótulo textual.
