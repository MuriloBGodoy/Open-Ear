/**
 * SettingsContext — preferências do usuário, persistidas em localStorage.
 *
 * Tudo aqui é preferência de acessibilidade antes de ser preferência de gosto:
 * tamanho de texto, contraste do tema, idioma do áudio (que muda a qualidade da
 * transcrição). Por isso vive num contexto global e é aplicado no <html>, não
 * dentro de um componente que possa desmontar.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import i18n, { type AppLanguage, type AudioLanguage, type Region } from '../i18n';

export type Theme = 'light' | 'dark' | 'system';

/**
 * Escala do texto da transcrição, em rem. O piso de 1.125rem (18px) é decisão de
 * acessibilidade: abaixo disso a leitura em movimento — que é o uso real deste
 * app — deixa de funcionar. Não é estética, é requisito.
 *
 * Cinco passos, não seis: 18 / 22 / 26 / 32 / 40 px. Passos maiores porque a
 * escolha é feita uma vez e precisa ser visível na hora — entre 22 e 26 px a
 * diferença se sente, entre 22 e 24 ninguém decide nada.
 */
export const TEXT_SIZES = [1.125, 1.375, 1.625, 2, 2.5];
/** 22px, um passo acima do piso: default confortável sem quebrar o layout. */
const DEFAULT_TEXT_SIZE = 1;

interface Settings {
  appLanguage: AppLanguage;
  audioLanguage: AudioLanguage;
  region: Region;
  textSizeIndex: number;
  theme: Theme;
}

interface SettingsContextValue extends Settings {
  setAppLanguage: (value: AppLanguage) => void;
  setAudioLanguage: (value: AudioLanguage) => void;
  setRegion: (value: Region) => void;
  setTextSizeIndex: (value: number) => void;
  setTheme: (value: Theme) => void;
  /** Locale efetivo para Intl — vem da região, não do idioma do app. */
  locale: string;
  formatDateTime: (timestamp: number) => string;
  formatDate: (timestamp: number) => string;
  /** Só hora e minuto — é o que serve de marca de tempo em cada fala. */
  formatTime: (timestamp: number) => string;
}

const KEY = {
  appLanguage: 'openear:appLanguage',
  audioLanguage: 'openear:audioLanguage',
  region: 'openear:region',
  textSize: 'openear:textSize',
  theme: 'openear:theme',
} as const;

function read(key: string, fallback: string): string {
  return localStorage.getItem(key) ?? fallback;
}

/** Região default derivada do navegador — chuta certo na maioria dos casos. */
function detectRegion(): Region {
  const nav = navigator.language;
  const known = ['pt-BR', 'pt-PT', 'en-US', 'en-GB', 'es-ES', 'es-MX'];
  if (known.includes(nav)) return nav as Region;
  if (nav.toLowerCase().startsWith('pt')) return 'pt-BR';
  if (nav.toLowerCase().startsWith('es')) return 'es-ES';
  return 'en-US';
}

/**
 * Idioma do áudio default: detecção automática.
 *
 * Isto INVERTE a decisão anterior, que era usar o idioma da interface. O
 * argumento contra o 'auto' continua verdadeiro: o Whisper decide o idioma pelos
 * primeiros segundos, e em legenda ao vivo cada segmento é curto, então ele erra
 * mais ali do que num arquivo longo.
 *
 * O que virou o jogo é comparar os dois ERROS, não os dois acertos. Quem legenda
 * uma conversa não escolhe o idioma de quem vai falar. Com o idioma fixo na
 * interface, alguém falando espanhol sai transcrito como se fosse português —
 * texto plausível, silenciosamente errado, e a pessoa surda que depende daquele
 * texto não tem como desconfiar. Com o 'auto', o erro aparece na tela e se
 * conserta fixando o idioma no chip ao lado das abas, que continua ali.
 *
 * No modo ao vivo o que segura a detecção é o prompt de contexto: cada segmento
 * sobe com as últimas falas já transcritas, o que ancora o modelo no idioma que
 * ele vinha usando em vez de decidir do zero a cada trecho.
 */
function defaultAudioLanguage(): AudioLanguage {
  return 'auto';
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [appLanguage, setAppLanguageState] = useState<AppLanguage>(
    () => i18n.language as AppLanguage
  );
  const [audioLanguage, setAudioLanguage] = useState<AudioLanguage>(
    () => read(KEY.audioLanguage, defaultAudioLanguage()) as AudioLanguage
  );
  const [region, setRegion] = useState<Region>(() => read(KEY.region, detectRegion()) as Region);
  const [textSizeIndex, setTextSizeIndexState] = useState(() => {
    const saved = Number(read(KEY.textSize, String(DEFAULT_TEXT_SIZE)));
    return Number.isInteger(saved) && saved >= 0 && saved < TEXT_SIZES.length
      ? saved
      : DEFAULT_TEXT_SIZE;
  });
  const [theme, setTheme] = useState<Theme>(() => read(KEY.theme, 'system') as Theme);

  // ---- efeitos: cada preferência escreve no lugar certo do documento --------

  const setAppLanguage = useCallback((value: AppLanguage) => {
    setAppLanguageState(value);
    void i18n.changeLanguage(value);
    localStorage.setItem(KEY.appLanguage, value);
    document.documentElement.lang = value;
  }, []);

  useEffect(() => {
    document.documentElement.lang = appLanguage;
  }, [appLanguage]);

  useEffect(() => {
    localStorage.setItem(KEY.audioLanguage, audioLanguage);
  }, [audioLanguage]);

  useEffect(() => {
    localStorage.setItem(KEY.region, region);
  }, [region]);

  useEffect(() => {
    document.documentElement.style.setProperty('--t-transcript', `${TEXT_SIZES[textSizeIndex]}rem`);
    localStorage.setItem(KEY.textSize, String(textSizeIndex));
  }, [textSizeIndex]);

  // 'system' não é um valor de data-theme: precisa virar light ou dark e
  // continuar seguindo o SO enquanto estiver selecionado.
  useEffect(() => {
    localStorage.setItem(KEY.theme, theme);
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const resolved = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };

    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const setTextSizeIndex = useCallback((value: number) => {
    setTextSizeIndexState(Math.min(TEXT_SIZES.length - 1, Math.max(0, value)));
  }, []);

  const value = useMemo<SettingsContextValue>(() => {
    const dateTime = new Intl.DateTimeFormat(region, { dateStyle: 'short', timeStyle: 'short' });
    const date = new Intl.DateTimeFormat(region, { dateStyle: 'medium' });
    const time = new Intl.DateTimeFormat(region, { hour: '2-digit', minute: '2-digit' });
    return {
      appLanguage,
      audioLanguage,
      region,
      textSizeIndex,
      theme,
      setAppLanguage,
      setAudioLanguage,
      setRegion,
      setTextSizeIndex,
      setTheme,
      locale: region,
      formatDateTime: (timestamp) => dateTime.format(timestamp),
      formatDate: (timestamp) => date.format(timestamp),
      formatTime: (timestamp) => time.format(timestamp),
    };
  }, [appLanguage, audioLanguage, region, textSizeIndex, theme, setAppLanguage, setTextSizeIndex]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings precisa estar dentro de <SettingsProvider>.');
  return ctx;
}

/** O que vai no parâmetro `language` da API — 'auto' significa não enviar nada. */
export function whisperLanguage(audioLanguage: AudioLanguage): string | undefined {
  return audioLanguage === 'auto' ? undefined : audioLanguage;
}
