# `library` — Biblioteca (áudios guardados)

## Briefing

A pessoa guarda arquivos de áudio aqui, prontos para mandar transcrever depois.
É uma **fila de trabalho**, não uma galeria: cada item tem um estado (guardado /
na fila / transcrevendo / pronto / erro) e uma ação primária óbvia
("Transcrever"). O erro clássico neste tipo de tela é desenhar um gerenciador de
arquivos bonito e esconder a ação que a pessoa vem fazer.

## Pesquisa

**Pinterest: 🔴 exit 4** — sem sessão salva (detalhe em `../_design-system/README.md`).
Nenhum pin citado. Segui com Dribbble.

| query (`--source dribbble`) | pasta | coletados |
| --- | --- | --- |
| `audio library file manager ui dark` | `pins/audio-library-file-manager-ui-dark/` | 6 |
| `audio files list ui player` | `pins/audio-files-list-ui-player/` | 6 |

12 referências. Links reais em `pins/sources.json`.

## Veredito por referência

Só as que abri com `Read`.

### [Noise Reducer App — Audio Recorder & File Management](https://dribbble.com/shots/27118975-Noise-Reducer-App-Audio-Recorder-File-Management-UI)
`pins/audio-files-list-ui-player/03--…jpg` · ✅ nativo · ♿ 🟡 parcial

A referência mais diretamente aproveitável da seção. Tela "Recent Files": título,
busca, **chips de filtro** (`Todos / Áudio / Vídeo` — o chip ativo é sólido e
tingido, os outros são contorno), e lista de linhas com ícone de tipo + nome do
arquivo + `duração · tamanho` + `⋯`. Exatamente a anatomia da nossa Biblioteca.
Adotado quase inteiro.
♿ 🟡 o `duração · tamanho` está em ~11px cinza-escuro sobre preto e o `⋯` é um
alvo pequeno. **Correções:** metadado em `--t-xs` 13px `--c-text-3` (6.49:1),
`⋯` em botão de 48px com `aria-label`. E o chip ativo não pode se distinguir só
por cor: ganha peso de fonte + `aria-pressed`.
A tela de gravação ao lado (forma de onda vermelha + timer grande + trio
`Cancelar / Pausar / Concluir` com **rótulo sob cada ícone**) reforça o padrão
que já adotei no Transcritor.

### [File Manager Dashboard UI — Library Page](https://dribbble.com/shots/15376733-File-Manager-Dashboard-UI-Library-Page)
`pins/audio-library-file-manager-ui-dark/01--…jpg` · 🟡 composição · ♿ 🔴 reprova

Shell de biblioteca em tema escuro: **rail estreito de ícones** à esquerda,
título "Library" + busca larga no topo, seção "Last added" em grade horizontal,
"Folders" como chips de duas colunas, e um índice alfabético lateral. O rail +
título + busca é a estrutura que confirmei para o shell (e alimentou a Opção A do
artifact). "Last added" adotado como faixa "Adicionados recentemente".
♿ 🔴 reprova em dois pontos graves: o rail tem **só ícones, sem rótulo nenhum**
(o §0 pede ícone com rótulo junto) e as legendas dos cartões são texto claro
sobre miniatura de imagem — contraste depende da foto, ou seja, imprevisível.
**Correções:** rail com rótulo permanente; nome do arquivo **fora** de qualquer
miniatura, sobre `--c-surface`. Índice alfabético descartado: com dezenas de
áudios, não centenas, ele é ruído.

### [In-App Media Player UI — Dark Mode, Expanded Controls](https://dribbble.com/shots/26891297-In-App-Media-Player-UI-Dark-Mode-Expanded-Controls)
`pins/audio-library-file-manager-ui-dark/05--…jpg` · 🔴 fora do alcance · ♿ 🔴 reprova

Player expandido em **painel de vidro flutuando sobre a grade de conteúdo**.
Útil como lição negativa e vale registrar: é o retrato do que o
`../_design-system/notes.md` §5 proíbe. O título da faixa está sobre vidro
translúcido em cima de miniaturas coloridas — o mesmo rótulo tem contraste
diferente conforme o que rola por trás. Não se prova AA nisso.
🔴 fora do alcance também por custo: `backdrop-filter` empilhado sobre grade
rolando é caro em mobile. **Adaptação viável:** o player de pré-escuta da
Biblioteca é uma **barra sólida** ancorada no rodapé do painel, `--c-surface-2`,
sem blur — o áudio aqui é só conferência ("é esse arquivo mesmo?"), não consumo.

## Decisão

- **Lista com estado**, não galeria. Cada linha: ícone de tipo · nome · `duração
  · tamanho · data` · **badge de estado** · ação primária "Transcrever".
- **Chips de filtro** por estado (Todos / Guardados / Prontos), chip ativo com
  cor **e** peso de fonte **e** `aria-pressed`.
- **Zona de largar arquivo** (drop zone) sempre visível no topo, com botão de
  seleção equivalente — arrastar não pode ser o único caminho.
- **Pré-escuta em barra sólida** ancorada, sem vidro. Com o aviso honesto de que
  pré-escuta é de utilidade limitada para o nosso usuário; ela existe para quem
  tem audição residual e para conferir o arquivo certo, e **nunca** é o único
  jeito de identificar um item (nome + duração + data fazem isso).
- Nome do arquivo **nunca** sobre miniatura.

Renderizado no artifact em miniatura; detalhamento fino quando o dono do código
pedir.
