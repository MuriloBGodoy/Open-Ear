/**
 * router.ts — roteamento por hash, escrito à mão.
 *
 * Quatro telas sem rota aninhada, sem loader, sem lazy. React Router aqui seriam
 * ~15 kB para resolver um problema que `hashchange` resolve em 40 linhas — e num
 * PWA que precisa abrir rápido em rede ruim, cada kB do bundle inicial conta.
 *
 * Hash e não History API porque o app é servido como estático (Pages, Blob,
 * qualquer CDN) e hash nunca precisa de rewrite no servidor.
 */

import { useCallback, useEffect, useState } from 'react';

export const ROUTES = ['transcriber', 'transcriptions', 'library', 'settings'] as const;

export type Route = (typeof ROUTES)[number];

export interface Location {
  route: Route;
  /** Parâmetros de query do hash — hoje só `file`, no salto biblioteca → transcritor. */
  params: URLSearchParams;
}

function parse(): Location {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query = ''] = raw.split('?');
  const route = (ROUTES as readonly string[]).includes(path) ? (path as Route) : 'transcriber';
  return { route, params: new URLSearchParams(query) };
}

export function navigate(route: Route, params?: Record<string, string>): void {
  const query = params && Object.keys(params).length ? `?${new URLSearchParams(params)}` : '';
  window.location.hash = `#/${route}${query}`;
}

export function useRouter() {
  const [location, setLocation] = useState<Location>(parse);

  useEffect(() => {
    const onChange = () => setLocation(parse());
    // Hash vazio no primeiro load: normaliza para que voltar no navegador funcione.
    if (!window.location.hash) window.location.replace('#/transcriber');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // A tela muda inteira: quem estava lendo o fim de uma transcrição não deve
  // aterrissar no meio da próxima.
  useEffect(() => {
    document.querySelector('.shell__main')?.scrollTo({ top: 0 });
  }, [location.route]);

  return { ...location, navigate: useCallback(navigate, []) };
}
