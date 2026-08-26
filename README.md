# Open Ear

**Turning sound into sight.** Transcrição de áudio e **legenda de conversa ao
vivo**, feita para pessoas com deficiência auditiva.

Quatro telas, acessíveis pela sidebar:

- **Transcritor** — modo *Ao vivo* (o microfone capta, o texto aparece em poucos
  segundos) e modo *Arquivo* (sobe um áudio ou vídeo e recebe a transcrição). Em
  tela larga a leitura fica na coluna grande e os controles — gravar, pausar,
  cronômetro, medidor de nível — numa coluna fixa à direita.
- **Transcrições** — arquivo de tudo que foi salvo, agrupado por recência (Hoje /
  Ontem / Últimos 7 dias / Últimos 30 dias / Mais antigas), com busca que varre o
  **texto inteiro**, não só o título.
- **Biblioteca** — onde a pessoa deixa áudios guardados para mandar transcrever
  quando der. Separa "trazer o arquivo" de "transcrever agora". Filtros *Todos /
  Na fila / Prontos* e, no que já rendeu texto, um atalho direto para a
  transcrição.
- **Ajustes** — idioma da interface, idioma do áudio, região, tamanho do texto e
  tema.

## Stack

| Camada | Escolha |
| --- | --- |
| Front | React 19 + TypeScript + Vite, PWA |
| Estilo | CSS puro com custom properties (`src/styles/tokens.css`) |
| i18n | i18next + react-i18next — pt-BR, en, es |
| Persistência | IndexedDB via `idb` — nada sai do dispositivo |
| Back | Netlify Functions em TypeScript (`frontend/netlify/functions/`) |
| Transcrição | Groq `whisper-large-v3-turbo` |

Uma linguagem só no projeto inteiro. O backend são duas funções de ~60 linhas e
existe por um motivo só: **a chave da Groq não pode ir para o cliente.** Recebe o
áudio, encaminha, devolve o texto e não guarda nada. Mesma origem do front, em
dev e em produção — não há CORS para configurar.

## Rodando

### 1. Chave da Groq (grátis)

Pegue em [console.groq.com/keys](https://console.groq.com/keys). O tier free dá
2.000 requisições/dia — de sobra para uso pessoal.

Localmente ela vive em `frontend/.env.local`, que não é versionado (veja
`.env.example`). Em produção, nas Environment Variables do site no Netlify —
nunca num arquivo, nunca no `netlify.toml`:

```bash
cd frontend
cp .env.example .env.local   # e preencha
```

Se a chave já circulou em texto puro em algum lugar — chat, e-mail, print, commit —
**revogue e gere outra**. Onde ela está guardada agora não desfaz onde ela passou.

### 2. Rodando tudo

```bash
cd frontend
npm install
npm run dev     # front + funções, mesma origem
# http://localhost:5173  ·  confira: /api/health
```

Um só comando, e transcrever funciona. Quem serve `/api/*` em dev é um plugin no
`vite.config.ts` que executa **os próprios arquivos** de `netlify/functions/` no
processo do Vite — não uma cópia nem um mock. A rota sai do `config.path` que cada
função exporta, a mesma fonte que a plataforma lê, então não há tabela de rotas
para sair de sincronia. Editar uma função e recarregar a página basta.

A alternativa oficial seria `npx netlify dev`, que faz o mesmo custando algumas
centenas de MB em `node_modules` — muito para dois handlers. Se você já tem a CLI,
ela continua funcionando (porta 8888) e é o espelho mais fiel de produção.

O que o plugin **não** cobre é o roteamento da plataforma em si. Isso só o deploy
prova.

### 3. Conferir o backend sem subir nada

```bash
node tools/api-check.mjs
```

Chama os handlers direto — o Node 24 roda TypeScript por type stripping, e as
funções são API web padrão (`Request` → `Response`), que é exatamente a
assinatura do Netlify Functions v2. O que executa aqui é o mesmo código que roda
em produção; o que ele **não** cobre é o roteamento da plataforma. Testa health,
os erros (sem áudio, método errado) e uma transcrição real com `.test-audio.wav`.
Sai com código 1 se algo quebrar. **Consome uma requisição da Groq.**

### 4. Conferir a UI (opcional)

```bash
node tools/screenshot.mjs --seed            # 4 rotas × 2 temas, desktop
node tools/screenshot.mjs --seed --mobile   # 390×844
```

Atravessa as rotas nos dois temas, salva em `.screenshots/` e **sai com código 2
se houver erro de console**. `--seed` grava dados de exemplo no IndexedDB, porque
captura só de tela vazia esconde exatamente o que quebra: título longo, badge da
sidebar, lista cheia, linha que embrulha no celular.

O `screenshot.mjs` só alcança tela parada, e o modo ao vivo é justamente o que tem
estado. Para ele:

```bash
node tools/live-check.mjs --seconds 14
```

Abre o Chromium, clica em *Começar a legendar* de verdade, **espera o texto
aparecer**, captura gravando, clica em *Pausar*, captura pausado e imprime
`{clock, bubbles, badge, transcrito}` lido do DOM.

Duas escolhas fazem ele provar algo em vez de só parecer verde:

**O microfone recebe um WAV real**, via `--use-file-for-fake-audio-capture`, e não
o bipe do `--use-fake-device-for-media-stream`. Com o bipe a Groq devolvia texto
vazio, e o driver anunciava "1 bolha" sobre uma bolha que só continha
*transcrevendo…*.

**Ele espera a bolha sair de *transcrevendo…*** antes de fechar o navegador, e
falha se isso não acontecer em 60s. Antes ele fechava com o POST ainda no ar,
cancelando a própria prova.

Com as duas, o que ele afirma é o caminho inteiro: AudioWorklet → VAD → WAV →
função → Groq → tela. Sai com código 2 se a transcrição não chegar ou se houver
erro de console. **Consome uma requisição da Groq.**

Use `--url` para apontar para produção depois do deploy, e `--audio` para trocar o
arquivo de fala.

E o modo Arquivo, que é o caminho que mais gente usa:

```bash
node tools/file-check.mjs
```

Escolhe o arquivo, espera a barra, lê o texto, clica em *Salvar* e **conta os
registros no IndexedDB** — o `live-check` para antes da única parte que persiste
algo. Atravessa decodificação, reamostragem para 16 kHz, fatiamento no silêncio,
envio e armazenamento; sai com código 2 se qualquer etapa não chegar ao fim.
**Consome uma requisição da Groq**, porque o áudio sintético vira segmento real.

## Decisões técnicas que valem saber

**Áudio é processado no navegador antes de subir.** O arquivo é decodificado,
reamostrado para 16 kHz mono (taxa nativa do Whisper) e fatiado em pedaços de
2 min. Isso resolve de uma vez o limite de tamanho e o timeout de requisição — e
dispensa ffmpeg no servidor.

**A fatia é de 2 min por causa da plataforma, não do modelo.** A Groq aceita
25 MB; quem aperta é o corpo máximo de uma função serverless. O Netlify anuncia
6 MB, mas payload binário trafega em base64 — uns 30% a mais — então o teto real
para áudio fica perto de 4,5 MB. A 32 KB/s (16 kHz mono 16-bit), 2 min dão
~3,8 MB, que viram ~5,1 MB codificados: cabe com ~15% de folga. Uma aula de 1h
vira ~30 requisições em vez de 6 — irrelevante frente às 2.000/dia. Se um dia o
backend virar servidor de longa duração, esse número pode voltar a subir: é uma
constante em `src/lib/audio.ts`.

**A legenda ao vivo é segmentada por pausa, não por relógio.** `src/lib/liveCapture.ts`
captura PCM cru via AudioWorklet, mede energia a cada 8 ms e fecha o segmento
quando detecta pausa real na fala. Fatiar a cada N segundos cortaria no meio da
palavra, e o Whisper alucina nas pontas de um corte assim. O corte no silêncio
também deixa cada segmento decodificável sozinho — o que o MediaRecorder em
chunks não entrega, porque só o primeiro fragmento leva cabeçalho.

**Ordem preservada com placeholder.** Segmentos são capturados em sequência mas
respondem fora de ordem; cada um entra na lista imediatamente como `pending` e é
preenchido quando resolve.

**Três idiomas independentes, não um.** Idioma da **interface** (i18next), idioma
do **áudio** (parâmetro do Whisper) e **região** (formato de data e número via
`Intl`) são configurações separadas. Quem usa a interface em português pode
transcrever uma aula em inglês morando em Portugal, e isso é comum.

**`language` ausente é intencional.** Quando o usuário escolhe detecção
automática, o campo não é enviado. Chutar `"pt"` é pior que deixar o modelo
detectar: forçar o idioma errado destrói a transcrição.

**Router escrito à mão** (`src/lib/router.ts`, ~50 linhas sobre `hashchange`).
React Router custaria ~15 kB num PWA que tem quatro rotas sem parâmetros
aninhados. O atalho da Biblioteca para a transcrição usa parâmetro de rota
(`#/transcriptions?session=<id>`), não estado de componente: assim o "voltar" do
navegador desfaz o salto e o link pode ser guardado.

**A pausa não solta o microfone.** `setPaused()` descarta os quadros mas mantém o
`MediaStream` vivo. Parar a captura de verdade faria alguns navegadores pedirem
permissão outra vez na retomada, e uma pausa que custa um diálogo de permissão não
serve para o meio de uma conversa. O cronômetro conta tempo de captação, não tempo
de tela: durante a pausa ele congela, senão o número deixaria de bater com a
duração do áudio efetivamente transcrito.

**Marcar a última fala por cor, nunca por tamanho.** Aumentar a fonte da linha mais
recente reflui tudo que está acima a cada segmento novo, e texto que se move faz a
pessoa perder o lugar onde estava lendo. Cor, borda e um rótulo resolvem sem
deslocar uma linha.

**Brilho só como estado, nunca como enfeite.** O `box-shadow` de brilho aparece no
painel de controle **enquanto grava** e na bolha da última fala — sempre carregando
informação. A primeira versão tinha um painel de vidro decorativo na coluna
lateral; na tela ele parecia um cartão que não carregou, e saiu. Vidro e brilho
seguem proibidos atrás de texto de transcrição: translucidez faz o contraste
depender do que passa por trás.

## Acessibilidade

Não é checklist de fim de tarefa — é o driver do design. Ver
[`designs/README.md`](designs/README.md), o artifact em
[`designs/_design-system/preview.html`](designs/_design-system/preview.html) e o
agente Michelangelo.

- WCAG 2.2 AA mínimo; **AAA (7:1)** no texto de transcrição
- Paleta provada por script: `node designs/_design-system/contrast.mjs`
- A marca não é um hex fixo — o ciano Miami (`#00B0DC`) é uma **posição na rampa**
  que muda com o fundo. `--c-accent` é seguro para texto (≥ 4,5:1);
  `--c-accent-ui` é só para objeto gráfico (medidor, progresso), onde o mínimo é
  3:1 e a cor pode aparecer saturada sem mentir sobre contraste
- Tamanho do texto escolhido de uma vez, em cinco tamanhos visíveis e rotulados em
  pixel (18 / 22 / 26 / 32 / 40), com amostra ao vivo. Substituiu o par A− / A+,
  que obrigava a adivinhar quantos toques faltam e não dizia onde a pessoa está
- Nenhum feedback exclusivamente sonoro — o medidor de nível é a prova visual de
  captação, e ele tem trilha desenhada: medidor vazio precisa continuar legível
  como medidor, senão o silêncio parece defeito
- O selo do painel fala de **sessão** (Parado / Gravando / Pausado) e o rótulo do
  medidor fala de **sinal** (microfone desligado / medidor parado / ouvindo /
  captando fala). Duas linhas com a mesma palavra é uma linha desperdiçada
- Ícone nunca aparece sozinho: sempre acompanha rótulo em texto. Para quem tem
  Libras como primeira língua e português como segunda, ícone + palavra é
  bem mais rápido do que ícone puro
- Ordem de tabulação preservada em telas estreitas: quando o cartão da Biblioteca
  quebra de linha, o apagar sobe visualmente para o canto via `order`, mas as ações
  de texto continuam vindo antes dele no DOM
- `aria-live="polite"` no transcript, foco visível, alvo de toque ≥ 48px
- Tema claro e escuro, ambos validados; respeita `prefers-reduced-motion` e `prefers-contrast`

## Agente Michelangelo

Especialista em UI/UX definido em [`.claude/agents/michelangelo.md`](.claude/agents/michelangelo.md).
Pesquisa referências visuais reais, baixa em `designs/<secao>/pins/` com link de
origem, e **sempre** apresenta um `preview.html` para aprovação antes de codar.

```bash
# referência visual (Dribbble funciona sem login)
node tools/design-research.mjs --query "live caption ui" --out designs/live-caption/pins

# habilitar Pinterest: login manual único, sessão fica salva
node tools/pinterest-login.mjs
node tools/design-research.mjs --query "..." --out ... --source pinterest
```

## Pendências conhecidas

- **Pinterest ainda não rendeu nada.** Exige sessão logada
  (`tools/.pinterest-session.json`, que não é versionado); as 83 referências de
  hoje vieram todas do Dribbble. Rodar `node tools/pinterest-login.mjs` uma vez
  destrava
- **Validar com usuário surdo real.** A prova de hoje é matemática de contraste e
  tamanho de alvo; falta gente
- Diarização (quem falou o quê) — Whisper não faz; exigiria AssemblyAI ou Deepgram
- **Deploy no Netlify ainda não feito.** Ver [Publicar](#publicar) — o código está
  pronto, falta criar o site e cadastrar a chave
- **Chave exposta num deploy público.** Com o link no ar, qualquer um que o tenha
  gasta a cota de 2.000/dia. Antes de divulgar, vale rate limiting por IP na
  função
- **A pasta `backend/` (ASP.NET) está órfã.** Foi substituída por
  `frontend/netlify/functions/` e não é mais referenciada por nada — pode ser
  apagada
- **O roteamento da plataforma nunca foi exercitado.** Os handlers estão provados
  em dois níveis — `api-check.mjs` chamando direto e `live-check.mjs` pelo
  navegador, com transcrição real nos dois. O que falta é o `/api/*` do próprio
  Netlify, e isso só o primeiro deploy resolve

## Publicar

O front é estático e as duas funções são serverless, então o mesmo site serve
tudo na mesma origem — sem CORS, sem proxy.

```bash
git remote add origin git@github.com:USUARIO/open-ear.git
git push -u origin main
```

Depois, no Netlify: **Add new site → Import an existing project**, escolher o
repositório e confirmar. O `netlify.toml` já responde por `base`, `publish`,
diretório de funções e versão do Node — a tela de configuração não precisa de
nenhum ajuste manual.

Falta um passo, e é o único que não está no repositório: **Site configuration →
Environment variables → `GROQ_API_KEY`**. Sem ela o site sobe, as telas
funcionam e o app avisa que a transcrição está indisponível — que é o
comportamento correto, não um erro.

Com o site no ar, o driver prova o caminho inteiro contra produção:

```bash
node tools/live-check.mjs --seconds 14 --url https://SEU-SITE.netlify.app
```

### O que não vai para o repositório, e por quê

| Ignorado | Motivo |
| --- | --- |
| `frontend/.env.local` | é a chave |
| `backend/bin/`, `backend/obj/` | artefato de build de um backend aposentado |
| `.screenshots/` | saída do `screenshot.mjs`, regerável, ~3 MB |
| `designs/**/pins/*.jpg` | trabalho autoral de terceiros; os `sources.json` ficam, e cada análise aponta para o link original |
