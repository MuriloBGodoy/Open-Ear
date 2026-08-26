/**
 * Home — a porta de entrada.
 *
 * Duas portas, e a ordem entre elas é a decisão de design da tela:
 *
 *   1. "Começar agora", logo abaixo do título. Vai direto para o transcritor
 *      sem escolher idioma nenhum — o app detecta sozinho, que é o padrão. É a
 *      saída rápida, e a resposta certa para a maioria.
 *   2. O globo, logo em seguida e grande. Quem quer fixar o idioma gira o
 *      planeta, toca num ponto, lê um cartão sobre o país e entra por ali.
 *
 * O QUE NÃO ESTÁ AQUI, E POR QUÊ
 * A explicação do que o app faz (legenda ao vivo, biblioteca, privacidade) mora
 * atrás do botão de informação, num diálogo. Ela é leitura de primeira visita, e
 * ocupava a altura inteira entre o título e o globo — empurrando para baixo da
 * dobra justamente a parte que explica a tela melhor do que qualquer parágrafo.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, type GlobeMarker, type LatLng } from '../components/Globe';
import { IconClose, IconGlobe, IconInfo, IconLibrary, IconMic } from '../components/Icons';
import type { AudioLanguage } from '../i18n';

interface Region {
  /** ISO 3166-1 alfa-2 — a chave que o Intl usa para dar o nome do país. */
  country: string;
  language: AudioLanguage;
  at: LatLng;
}

/**
 * Um país por idioma que o app oferece, mais os pares óbvios (Brasil/Portugal,
 * EUA/Reino Unido, Espanha/México). Curta de propósito: são pontos num globo, e
 * um planeta coberto de bolinhas não é um mapa, é ruído.
 */
const REGIONS: Region[] = [
  { country: 'BR', language: 'pt', at: [-14.24, -51.93] },
  { country: 'PT', language: 'pt', at: [39.4, -8.22] },
  { country: 'US', language: 'en', at: [37.09, -95.71] },
  { country: 'GB', language: 'en', at: [55.38, -3.44] },
  { country: 'ES', language: 'es', at: [40.46, -3.75] },
  { country: 'MX', language: 'es', at: [23.63, -102.55] },
  { country: 'FR', language: 'fr', at: [46.23, 2.21] },
  { country: 'DE', language: 'de', at: [51.17, 10.45] },
  { country: 'IT', language: 'it', at: [41.87, 12.57] },
  { country: 'JP', language: 'ja', at: [36.2, 138.25] },
  { country: 'CN', language: 'zh', at: [35.86, 104.19] },
];

/**
 * O tema já resolvido ('light' | 'dark') que o SettingsContext escreveu no
 * documento. Lido do DOM em vez de recalculado aqui porque `theme` no contexto
 * pode ser 'system', e o globo precisa de uma resposta binária — duplicar a
 * regra de resolução criaria um segundo lugar capaz de discordar do primeiro.
 */
function useResolvedTheme(): string {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? 'light');

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.dataset.theme ?? 'light');
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    sync();
    return () => observer.disconnect();
  }, []);

  return theme;
}

interface HomeProps {
  /** Aplica o idioma e leva para o transcritor. */
  onStart: (language: AudioLanguage) => void;
}

export function Home({ onStart }: HomeProps) {
  const { t, i18n } = useTranslation();
  const theme = useResolvedTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const aboutRef = useRef<HTMLDialogElement>(null);

  /**
   * Nome do país no idioma da interface, pelo próprio navegador. Escrever
   * "Alemanha/Germany/Alemania" à mão seriam trinta strings de tradução para
   * uma informação que o Intl já tem correta em todo idioma.
   */
  const displayNames = useMemo(() => {
    try {
      return new Intl.DisplayNames([i18n.language], { type: 'region' });
    } catch {
      return null; // navegador sem Intl.DisplayNames: cai no código do país.
    }
  }, [i18n.language]);

  const countryName = (code: string) => displayNames?.of(code) ?? code;
  const languageName = (language: AudioLanguage) => t(`home.lang.${language}`);

  const markers: GlobeMarker[] = REGIONS.map((region) => ({
    id: region.country,
    at: region.at,
    // O leitor de tela anuncia país e idioma juntos: uma bolinha sem rótulo não
    // diz nada, e "Brasil" sozinho não explica o que escolher ali significa.
    label: `${countryName(region.country)} — ${languageName(region.language)}`,
  }));

  const active = REGIONS.find((region) => region.country === selected) ?? null;

  return (
    <div className="home">
      {/* ------------------------------------------------- o convite e a saída */}
      <header className="home__hero">
        <h1 className="home__title">{t('home.welcome')}</h1>
        <p className="home__lead">{t('home.lead')}</p>

        <button type="button" className="btn btn--primary btn--lg" onClick={() => onStart('auto')}>
          <IconMic size={20} />
          {t('home.getStarted')}
        </button>
        <p className="hint">{t('home.autoHint')}</p>
      </header>

      {/* ------------------------------------------------------------- o globo */}
      <section className="home__world" aria-labelledby="home-world">
        {/**
         * O título da seção existe para a estrutura de cabeçalhos — é por ela
         * que quem usa leitor de tela navega — mas fica só para leitor: escrito
         * na tela, ele repetiria o que a linha logo abaixo já diz, e roubaria da
         * dobra a altura que o globo precisa.
         */}
        <h2 className="sr-only" id="home-world">
          {t('home.pickTitle')}
        </h2>
        <p className="home__pickhint">{t('home.worldHint')}</p>

        {/**
         * Globo e cartão vivem no mesmo palco porque em tela larga um reage ao
         * outro: escolher um país desliza o planeta para a esquerda e abre o
         * cartão no espaço que sobrou. Empilhados, a resposta ao clique nascia
         * abaixo da dobra — a pessoa tocava num ponto e não via nada acontecer.
         *
         * O globo é TRANSLADADO, não redimensionado. Mudar a largura dele
         * obrigaria o cobe a reconstruir o quadro a cada passo da animação;
         * `transform` não toca no canvas e roda na GPU.
         */}
        <div className="home__stage" data-open={active !== null}>
          <Globe markers={markers} selectedId={selected} onSelect={setSelected} theme={theme} />

          {/**
           * O cartão do país. `aria-live` porque a escolha acontece num ponto do
           * globo, longe daqui: sem o anúncio, quem usa leitor de tela clicaria
           * no marcador e não saberia que apareceu um cartão em outro lugar.
           */}
          <div className="countrycard" data-empty={!active} aria-live="polite">
            {active ? (
              <>
                <div className="countrycard__text">
                  <h3 className="countrycard__name">{countryName(active.country)}</h3>
                  <p className="countrycard__lang">
                    {t('home.cardLanguage', { language: languageName(active.language) })}
                  </p>
                  <p className="countrycard__body">
                    {t('home.cardBody', { language: languageName(active.language) })}
                  </p>
                </div>

                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => onStart(active.language)}
                >
                  {t('home.cardCta', { language: languageName(active.language) })}
                </button>

                {/* Fechar devolve o planeta ao centro. */}
                <button
                  type="button"
                  className="btn btn--icon countrycard__close"
                  onClick={() => setSelected(null)}
                  aria-label={t('common.close')}
                >
                  <IconClose size={18} />
                </button>
              </>
            ) : (
              <p className="hint">{t('home.cardEmpty')}</p>
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------- "o que é isso?", no canto */}
      <button
        type="button"
        className="home__info"
        onClick={() => aboutRef.current?.showModal()}
        aria-label={t('home.aboutLabel')}
      >
        <IconInfo size={24} />
      </button>

      {/**
       * `<dialog>` nativo com `showModal()`: a armadilha de foco, o Esc para
       * fechar e o `aria-modal` vêm de graça e corretos. Reimplementar isso à
       * mão é o caminho mais curto para um diálogo que prende quem usa teclado.
       */}
      <dialog
        ref={aboutRef}
        className="modal"
        // Clicar no fundo fecha. O alvo do clique só é o próprio <dialog>
        // quando o ponteiro caiu fora do painel interno.
        onClick={(event) => {
          if (event.target === aboutRef.current) aboutRef.current?.close();
        }}
      >
        <div className="modal__panel">
          <div className="modal__head">
            <h2 className="modal__title">{t('home.aboutTitle')}</h2>
            <button
              type="button"
              className="btn btn--icon"
              onClick={() => aboutRef.current?.close()}
              aria-label={t('common.close')}
            >
              <IconClose />
            </button>
          </div>

          <ul className="home__points">
            <li className="home__point">
              <IconMic size={22} className="home__pointicon" />
              <span>
                <strong>{t('home.liveTitle')}</strong>
                {t('home.liveBody')}
              </span>
            </li>
            <li className="home__point">
              <IconLibrary size={22} className="home__pointicon" />
              <span>
                <strong>{t('home.fileTitle')}</strong>
                {t('home.fileBody')}
              </span>
            </li>
            <li className="home__point">
              <IconGlobe size={22} className="home__pointicon" />
              <span>
                <strong>{t('home.privacyTitle')}</strong>
                {t('home.privacyBody')}
              </span>
            </li>
          </ul>
        </div>
      </dialog>
    </div>
  );
}
