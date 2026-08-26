# `_design-system` — paleta e navegação

## Briefing

O app virou **Open Ear — Turning sound into sight** e trocou coluna-com-abas por
**shell com sidebar** de 4 seções. Preciso de duas coisas: uma paleta cinza frio
+ Miami blue que passe AA/AAA nos dois temas, e um padrão de navegação lateral
que sobreviva ao mobile sem roubar a tela do transcript.

O usuário mandou uma referência de landing dark (glow azul, glass, display
prateada). Adotamos o **clima**, não a mecânica — ver `notes.md` §5 para a
fronteira exata.

## Pesquisa

### Pinterest: 🔴 bloqueado

Rodei o que o usuário pediu, primeiro, antes de qualquer outra coisa:

```
node tools/design-research.mjs --query "dark dashboard ui glow blue accent" \
  --out designs/_design-system/pins --limit 8 --source pinterest
```

Saída literal:

```
[michelangelo] ERRO: --source pinterest exige sessão salva.
[michelangelo] Rode uma vez:  node tools/pinterest-login.mjs
[michelangelo] Ou use:        --source dribbble  (funciona sem login)
EXIT=4
```

**Exit code 4.** Não existe `tools/.pinterest-session.json`. Nenhum pin foi
coletado, nenhum pin é citado neste estudo. Para habilitar, o usuário roda **uma
vez** `node tools/pinterest-login.mjs` (Chromium abre, ele loga na mão, a sessão
fica salva) e eu refaço a busca.

Segui com Dribbble, que funcionou em todas as queries.

### Queries executadas (todas `--source dribbble`)

| query | pasta | coletados |
| --- | --- | --- |
| `dark dashboard ui glow blue accent` | `pins/dark-dashboard-ui-glow-blue-accent/` | 7 |
| `sidebar navigation app ui dark` | `pins/sidebar-navigation-app-ui-dark/` | 7 |
| `cyan blue grey design system` | `pins/cyan-blue-grey-design-system/` | 6 |
| `glassmorphism dashboard cards dark` | `pins/glassmorphism-dashboard-cards-dark/` | 6 |

26 referências em disco. Links reais em `pins/sources.json` (índice consolidado)
e no `sources.json` de cada subpasta.

## Veredito por referência

Só listo as que **abri com `Read`** — as outras estão em disco, não foram
analisadas, e não sustentam nenhuma decisão.

### [VitaSphere Healthcare Dashboard — Dark Mode](https://dribbble.com/shots/27528244-VitaSphere-Healthcare-Dashboard-UI-Dark-Mode-Patient-Monitor)
`pins/cyan-blue-grey-design-system/05--…jpg` · 🟡 composição · ♿ **reprova como está**

A referência mais útil das 26, e a que mais valida a direção do usuário: fundo
navy quase preto, acento **ciano/teal**, rail de ícones à esquerda, glow suave
atrás dos cartões. É a prova visual de que ciano sobre near-black funciona.
♿ o problema: metadado de 11–12px em cinza médio sobre azul escuro, e rótulo de
métrica ("Lower Lobe", "Day 2-3") em contraste baixo. **Correção adotada:**
metadado sobe para `--t-xs` 13px com `--c-text-3` (6.49:1) e nada abaixo disso.
🟡 sai com CSS puro: gradiente radial + `border: 1px solid var(--c-border)`.

### [Modern Sidebar Navigation Dark UI](https://dribbble.com/shots/26584619-Modern-Sidebar-Navigation-Dark-UI)
`pins/sidebar-navigation-app-ui-dark/07--…jpg` · ✅ nativo · ♿ passa com uma correção

Mostra **exatamente** a comparação que eu precisava: o mesmo menu como rail só de
ícone e como painel ícone+rótulo, lado a lado. Item ativo com fundo levemente
elevado + ícone colorido. Raio grande, densidade folgada, alvos gordos.
Origem direta da **Opção A** e da **Opção B** do artifact.
♿ o rail só-ícone **não tem rótulo nenhum** — inaceitável no §0 (ícone precisa
carregar significado *junto* do rótulo). **Correção adotada:** o rail ganha
rótulo permanente de 11–13px sob o ícone; sem rótulo, ele não entra.

### [Sidebar menu — app shell](https://dribbble.com/shots/27161223-Sidebar-menu)
`pins/sidebar-navigation-app-ui-dark/04--…jpg` · ✅ nativo · ♿ 🟡 parcial

Sidebar densa com **grupos rotulados** ("Advisor Suite", "Advisor Toolkit"),
badges de estado, e o bloco utilitário grudado no rodapé (Feedback/Support/
Settings). O rodapé fixo é o padrão que adotei para Ajustes + toggle de tema:
tira Ajustes da disputa de atenção com as 3 seções de trabalho.
♿ texto de 11–12px em cinza sobre cinza escuro, e badge "Beta"/"Soon" quase
invisível. Com só 4 seções não preciso de grupo rotulado — descartei a
subdivisão e mantive só o rodapé.

### [AI Dashboard Sidebar — Dark/Light](https://dribbble.com/shots/26648282-AI-Dashboard-Sidebar-Dark-Light-Web-App-UI-Design)
`pins/sidebar-navigation-app-ui-dark/01--…jpg` · 🟡 composição · ♿ 🔴 reprova

Colapso expandido→rail com o botão-chevron na aresta, e submenu do rail virando
popover. O chevron na aresta é bom e foi adotado. O submenu-popover eu recusei:
mais um nível de navegação para 4 seções é ruído.
♿ 🔴 reprova feio — texto marrom-claro sobre marrom, "MAIN"/"MESSAGES" em ~10px,
e o painel é translúcido sobre um wallpaper laranja: contraste imprevisível. É
literalmente o caso que o `notes.md` §5 proíbe.

### [Analytics Dashboard with AI Assistant — Dark UI](https://dribbble.com/shots/27439956-Analytics-Dashboard-with-AI-Assistant-Dark-UI)
`pins/dark-dashboard-ui-glow-blue-accent/04--…jpg` · ✅ nativo · ♿ ✅ passa

O melhor exemplo de **inversão como hierarquia**: quase tudo é cinza-grafite
discreto e um único cartão é claro sólido com números enormes em preto. Não usa
glow nem vidro para destacar — usa luminância. Isso é ouro para nós: é assim que
eu destaco a última fala do transcript sem tocar em translucidez.
♿ passa: números grandes e escuros sobre superfície clara sólida, rótulos
legíveis. Origem do padrão "última fala em `--c-accent-soft` sólido".

### [Dark Mode Bento Grid](https://dribbble.com/shots/27476680-Dark-Mode-Bento-Grid-Design-Workflow-Automation-Feature-Section)
`pins/dark-dashboard-ui-glow-blue-accent/06--…jpg` · 🟡 composição · ♿ 🔴 reprova no corpo

Cartões near-black com um glow colorido *contido dentro* do cartão e título
branco pesado embaixo. O glow serve de assinatura sem invadir o texto — é o
tratamento que adotei para o cartão de ornamento.
♿ 🔴 o parágrafo de apoio é cinza médio sobre near-black em ~14px: reprova AA.
**Correção:** nosso corpo usa `--c-text-2` (10.32:1), não cinza médio.

### [Dark Theme Crypto Trading Bot — Neon Liquid Glass](https://dribbble.com/shots/26140888-Dark-Theme-Crypto-Trading-Bot-UI-Neon-Liquid-Glass-Clay)
`pins/dark-dashboard-ui-glow-blue-accent/02--…jpg` · 🔴 fora do alcance · ♿ 🔴 reprova

É o parente mais próximo da referência que o usuário mandou: vidro/cromo
iridescente, borda luminosa, painéis azul-escuros flutuando. Bonito e é **a
lição negativa mais útil do lote**: quase todo o texto está sobre vidro
translúcido em cima de um render 3D, e o mesmo rótulo tem contraste diferente
dependendo de onde caiu. Não se prova 7:1 nisso.
🔴 fora do alcance: render 3D + `backdrop-filter` empilhado, sem WebGL/asset
pesado não sai. **Adaptação viável já descrita:** a *assinatura* de vidro fica
num único cartão decorativo (`--c-glass-*`) em área sem leitura, `aria-hidden`,
feito com gradiente + `border` de 1px. Zero KB extra, zero risco de contraste.

### [Dark Mode Dashboard Cards — Activity & Notifications](https://dribbble.com/shots/26409524-Dark-Mode-Dashboard-Cards-Activity-Notifications)
`pins/glassmorphism-dashboard-cards-dark/02--…jpg` · ✅ nativo · ♿ 🟡 parcial

Anatomia de linha de lista que eu reusei nas 3 seções de conteúdo: badge de
ícone colorido + título forte + descrição + timestamp + `⋮`, e um segmentado
`All / Unread / Read` no topo. Divisórias hairline em vez de cartão por item —
mais denso, e densidade é o que a gente quer numa ferramenta de uso contínuo.
♿ 🟡 a descrição é cinza sobre roxo-escuro no limite do AA e o estado é
comunicado **só por cor** ("In Progress" verde, "Overdue" vermelho).
**Correção adotada:** todo estado leva ícone + rótulo, nunca só cor.

## Decisão

- **Paleta:** cinza frio + rampa Miami blue de 11 passos. Números e justificativa
  em `notes.md`. Implementada em `frontend/src/styles/tokens.css`. 84/84 pares
  passam em `contrast.mjs`.
- **Navegação:** 3 opções no artifact (`preview.html`). Recomendação: **Opção B —
  rail de 76px com ícone + rótulo permanente**, que vira barra inferior no mobile.
  Racional e trade-offs no artifact e no `designs/README.md`.
- **Glass/glow:** confinados a ornamento e estado interativo. Proibidos atrás de
  texto de transcrição. Fronteira em `notes.md` §5.

## Arquivos

| arquivo | o que é |
| --- | --- |
| `notes.md` | rampas, tokens semânticos, contraste par-por-par, fronteira do glass |
| `contrast.mjs` | a régua. `node designs/_design-system/contrast.mjs` |
| `contrast-report.txt` | saída completa: 84/84 |
| `preview.html` | **o artifact** — paleta, 3 opções de sidebar, tela do Transcritor, prova de a11y |
| `pins/` | 26 referências + `sources.json` com link real |
