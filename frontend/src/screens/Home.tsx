/**
 * Home — a porta de entrada.
 *
 * Duas funções, nesta ordem: dizer o que o app é para quem chegou agora, e tirar
 * a pessoa daqui já com o idioma certo escolhido.
 *
 * POR QUE ESCOLHER REGIÃO E NÃO IDIOMA
 * Idioma do áudio é o campo que mais estraga uma transcrição, e é também o que a
 * pessoa menos sabe responder no formato "código de idioma". "De onde vem a
 * conversa?" é uma pergunta que qualquer um responde, e um país mapeia para um
 * idioma sem ambiguidade prática. Quem não sabe tem a saída de sempre: detectar
 * automaticamente, que é o default do app de qualquer forma.
 *
 * O GLOBO É ORNAMENTO, OS BOTÕES SÃO O CONTROLE
 * Ver `Globe.tsx`. Passar o mouse ou o foco por um botão gira o planeta até o
 * país; clicar leva direto para o transcritor. O globo confirma a escolha, nunca
 * a recebe — se o WebGL não existir, nada aqui deixa de funcionar.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, type LatLng } from '../components/Globe';
import { IconGlobe, IconLibrary, IconMic, LogoMark } from '../components/Icons';
import type { AudioLanguage } from '../i18n';

interface Region {
  /** ISO 3166-1 alfa-2 — a chave que o Intl usa para dar o nome do país. */
  country: string;
  language: AudioLanguage;
  at: LatLng;
}

/**
 * Um país por idioma que o app oferece, mais os pares óbvios (Brasil/Portugal,
 * EUA/Reino Unido, Espanha/México). A lista é curta de propósito: é uma partida
 * rápida, não um seletor de todos os países do mundo — quem precisar de outro
 * idioma troca no chip ao lado das abas, dentro do transcritor.
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

const MARKERS = REGIONS.map((region) => region.at);

/**
 * O tema já resolvido ('light' | 'dark') que o SettingsContext escreveu no
 * documento. Lido do DOM em vez de recalculado aqui porque `theme` no contexto
 * pode ser 'system', e o globo precisa de uma resposta binária — duplicar a
 * regra de resolução seria criar um segundo lugar capaz de discordar do
 * primeiro.
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
  const [preview, setPreview] = useState<LatLng | null>(null);

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

  const languageLabel = (language: AudioLanguage) => t(`home.lang.${language}`);

  return (
    <div className="home">
      {/* ------------------------------------------------------------ o convite */}
      <header className="home__hero">
        <div className="home__intro">
          <span className="home__badge">
            <LogoMark size={22} className="brand__mark" />
            Open Ear
          </span>

          <h1 className="home__title">{t('home.welcome')}</h1>
          <p className="home__lead">{t('home.lead')}</p>

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

        <div className="home__globe">
          <Globe markers={MARKERS} focus={preview} theme={theme} />
        </div>
      </header>

      {/* ---------------------------------------------------- a escolha de região */}
      <section className="home__pick" aria-labelledby="home-pick">
        <h2 className="home__picktitle" id="home-pick">
          {t('home.pickTitle')}
        </h2>
        <p className="home__pickhint">{t('home.pickHint')}</p>

        <ul className="regions">
          {REGIONS.map((region) => (
            <li key={region.country}>
              <button
                type="button"
                className="region"
                onClick={() => onStart(region.language)}
                /**
                 * Passar o foco também gira o globo, não só o mouse: quem navega
                 * por teclado recebe exatamente o mesmo retorno visual de quem
                 * navega apontando.
                 */
                onMouseEnter={() => setPreview(region.at)}
                onFocus={() => setPreview(region.at)}
                onMouseLeave={() => setPreview(null)}
                onBlur={() => setPreview(null)}
              >
                <span className="region__name">{countryName(region.country)}</span>
                <span className="region__lang">{languageLabel(region.language)}</span>
              </button>
            </li>
          ))}
        </ul>

        {/**
         * A saída para quem não sabe. Fica fora da grade e com peso de ação
         * primária porque é a resposta CERTA na dúvida — e porque é o default do
         * app, então escolhê-la não é desistir de configurar, é confirmar.
         */}
        <button type="button" className="btn btn--primary home__auto" onClick={() => onStart('auto')}>
          <IconGlobe size={20} />
          {t('home.autoStart')}
        </button>
        <p className="hint">{t('home.autoHint')}</p>
      </section>
    </div>
  );
}
