/**
 * Sidebar — navegação principal.
 *
 * Decisões que não são estéticas:
 *
 * - Rótulo sempre em texto, nunca só ícone. Muitos usuários surdos têm Libras
 *   como primeira língua e português como segunda; ícone abstrato exige um
 *   segundo salto de interpretação que texto curto dispensa.
 * - No mobile vira gaveta, mas o botão que abre fica no topo com rótulo visível.
 * - `aria-current="page"` além do destaque visual: quem navega por leitor de tela
 *   precisa saber onde está, e cor sozinha nunca é informação suficiente.
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { Route } from '../lib/router';
import {
  IconMic,
  IconTranscripts,
  IconLibrary,
  IconSettings,
  IconClose,
  LogoMark,
} from './Icons';

interface SidebarProps {
  current: Route;
  counts: { transcriptions: number; library: number };
  /** Aberta como gaveta no mobile. No desktop a sidebar é sempre visível. */
  drawerOpen: boolean;
  onNavigate: (route: Route) => void;
  onCloseDrawer: () => void;
}

const ITEMS: { route: Route; Icon: typeof IconMic; badge?: 'transcriptions' | 'library' }[] = [
  { route: 'transcriber', Icon: IconMic },
  { route: 'transcriptions', Icon: IconTranscripts, badge: 'transcriptions' },
  { route: 'library', Icon: IconLibrary, badge: 'library' },
  { route: 'settings', Icon: IconSettings },
];

export function Sidebar({
  current,
  counts,
  drawerOpen,
  onNavigate,
  onCloseDrawer,
}: SidebarProps) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  // Gaveta aberta: foco vai para dentro dela e Esc fecha. Sem isso, teclado e
  // leitor de tela continuam presos no conteúdo que está atrás do overlay.
  useEffect(() => {
    if (!drawerOpen) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, onCloseDrawer]);

  return (
    <>
      {drawerOpen && <div className="shell__scrim" onClick={onCloseDrawer} aria-hidden="true" />}

      <div className="sidebar" data-open={drawerOpen}>
        <div className="sidebar__head">
          <span className="brand">
            <LogoMark size={30} className="brand__mark" />
            <span className="brand__text">
              <span className="brand__name">Open Ear</span>
              <span className="brand__tagline">{t('brand.tagline')}</span>
            </span>
          </span>

          <button
            ref={closeRef}
            type="button"
            className="btn btn--icon sidebar__close"
            onClick={onCloseDrawer}
            aria-label={t('common.close')}
          >
            <IconClose />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label={t('nav.sectionLabel')}>
          <ul>
            {ITEMS.map(({ route, Icon, badge }) => {
              const active = current === route;
              const count = badge ? counts[badge] : 0;
              return (
                <li key={route}>
                  <button
                    type="button"
                    className="navitem"
                    data-active={active}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate(route)}
                  >
                    <Icon />
                    <span className="navitem__label">{t(`nav.${route}`)}</span>
                    {count > 0 && <span className="navitem__badge">{count}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Curto de propósito: o texto longo de privacidade vive em Ajustes. */}
        <p className="sidebar__foot">{t('nav.privacyShort')}</p>
      </div>
    </>
  );
}
