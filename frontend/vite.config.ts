import { defineConfig, loadEnv, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

type Handler = (request: Request) => Response | Promise<Response>;

/** Cabeçalhos que só valem entre dois pontos de uma conexão — não repassar. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
  'te',
  'trailer',
  'proxy-authenticate',
  'proxy-authorization',
  'host',
]);

/**
 * Executa as funções de `netlify/functions/` dentro do próprio servidor de
 * desenvolvimento.
 *
 * Sem isto, `npm run dev` sobe só o front: o Vite não conhece `/api/transcribe`,
 * responde 404, e transcrever não funciona localmente. A alternativa oficial é a
 * `netlify-cli`, que resolve o mesmo problema custando algumas centenas de MB em
 * `node_modules` — muito para dois handlers.
 *
 * O que roda aqui é **o mesmo arquivo** que a Netlify executa em produção, não
 * uma cópia: as funções são API web padrão (`Request` → `Response`), então basta
 * traduzir a requisição do Node para `Request` e escrever a `Response` de volta.
 * A rota vem do `config.path` exportado por cada função, a mesma fonte que a
 * plataforma lê — não há tabela de rotas duplicada para sair de sincronia.
 *
 * O que continua fora do alcance daqui é o roteamento da plataforma em si. Isso
 * só o deploy prova.
 */
function netlifyFunctions(): Plugin {
  return {
    name: 'open-ear:netlify-functions',
    // Só no `dev`. Em `build` não existe servidor, e nada disto vai para o bundle.
    apply: 'serve',

    configureServer(server) {
      // Prefixo vazio lê o `.env.local` inteiro, e não só o que começa com
      // `VITE_`. Seguro porque estamos no processo do Vite: a chave entra no
      // `process.env` do servidor e nunca é exposta ao cliente.
      const env = loadEnv(server.config.mode, server.config.envDir, '');
      process.env.GROQ_API_KEY ??= env.GROQ_API_KEY;

      const dir = join(server.config.root, 'netlify', 'functions');

      server.middlewares.use((req, res, next) => {
        const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
        if (!pathname.startsWith('/api/')) return next();

        void (async () => {
          try {
            const handler = await routeFor(server, dir, pathname);
            // Nenhuma função responde por este caminho. 404 em JSON, e não
            // `next()`: o fallback da SPA devolveria o index.html com status 200,
            // que é o oposto do que a Netlify faz — lá `/api/*` sem função é 404.
            if (!handler) {
              res.statusCode = 404;
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: `Nenhuma função responde por ${pathname}.` }));
              return;
            }

            const headers = new Headers();
            for (const [name, value] of Object.entries(req.headers)) {
              if (HOP_BY_HOP.has(name) || value === undefined) continue;
              for (const one of Array.isArray(value) ? value : [value]) headers.append(name, one);
            }

            // Corpo bufferizado, e não em stream: são no máximo 4,5 MB, e é assim
            // que a Netlify entrega o corpo para a função de qualquer forma.
            const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
            const chunks: Buffer[] = [];
            if (hasBody) for await (const chunk of req) chunks.push(chunk as Buffer);

            const response = await handler(
              new Request(`http://localhost${req.url ?? '/'}`, {
                method: req.method,
                headers,
                body: chunks.length ? Buffer.concat(chunks) : undefined,
              }),
            );

            res.statusCode = response.status;
            response.headers.forEach((value, name) => res.setHeader(name, value));
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (error) {
            // JSON, e não a página de erro do Vite: o cliente chama `res.json()`
            // no que voltar, e HTML aqui viraria um erro sem sentido na tela.
            server.config.logger.error(`[api] ${pathname} falhou: ${String(error)}`);
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(
              JSON.stringify({ error: 'A função local falhou. O motivo está no terminal do Vite.' }),
            );
          }
        })();
      });
    },
  };
}

/**
 * Acha a função que responde por `pathname`, lendo o `config.path` de cada uma.
 *
 * `ssrLoadModule` transpila o TypeScript e reflete edições sem reiniciar o
 * servidor — mexer numa função e recarregar a página basta.
 */
async function routeFor(
  server: ViteDevServer,
  dir: string,
  pathname: string,
): Promise<Handler | null> {
  for (const entry of readdirSync(dir)) {
    if (!/\.m?ts$/.test(entry)) continue;
    const mod = await server.ssrLoadModule(join(dir, entry));
    const route = (mod as { config?: { path?: string } }).config?.path;
    if (route === pathname) return (mod as { default: Handler }).default;
  }
  return null;
}

export default defineConfig({
  plugins: [
    react(),
    netlifyFunctions(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Open Ear — Turning sound into sight',
        short_name: 'Open Ear',
        description: 'Transcrição de áudio e legenda ao vivo, feita para quem não ouve.',
        lang: 'pt-BR',
        start_url: '/',
        display: 'standalone',
        background_color: '#0b1420',
        theme_color: '#0b1420',
        // Os PNG saem do `icon.svg` via `node tools/icons.mjs` — regerar depois
        // de qualquer mexida no SVG.
        //
        // Por que PNG e não só o SVG: o Chrome exige pelo menos um PNG de 192 e
        // um de 512 para oferecer "instalar". Com SVG apenas, o app abre no
        // navegador e nunca vira app.
        //
        // O `maskable` é um arquivo separado, e não o mesmo com outro `purpose`:
        // o sistema recorta o ícone na forma que quiser (círculo, squircle), e
        // um desenho que encosta na borda perde pedaço. O arquivo maskable já
        // vem com fundo sangrado e o desenho a 70%.
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          // SVG por último: quem souber usar ganha nitidez em qualquer tamanho.
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
    }),
  ],
  // Sem proxy: funções e front vivem na mesma origem, em dev e em produção. Em
  // dev quem serve `/api/*` é o plugin acima, no mesmo processo.
  server: {
    port: 5173,
  },
});
