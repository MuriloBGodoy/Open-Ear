/**
 * i18n — idioma da interface.
 *
 * Duas escolhas de idioma existem neste app e elas NÃO são a mesma coisa:
 *
 *   - idioma do app    → estes recursos aqui, o texto que a pessoa lê na tela
 *   - idioma do áudio  → o que se fala na gravação, vai como parâmetro pro Whisper
 *
 * Alguém surdo no Brasil pode perfeitamente querer a interface em português e
 * legendar uma reunião em inglês. Amarrar os dois numa configuração só quebraria
 * exatamente o caso de uso que mais precisa do app.
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';
import es from './locales/es.json';

export const APP_LANGUAGES = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number]['code'];

/** Regiões que mudam formato de data/hora/número. */
export const REGIONS = [
  { code: 'pt-BR', label: 'Brasil' },
  { code: 'pt-PT', label: 'Portugal' },
  { code: 'en-US', label: 'United States' },
  { code: 'en-GB', label: 'United Kingdom' },
  { code: 'es-ES', label: 'España' },
  { code: 'es-MX', label: 'México' },
] as const;

export type Region = (typeof REGIONS)[number]['code'];

/**
 * Idiomas de áudio: os que o Whisper reconhece bem o suficiente para uso real.
 * A lista completa do modelo tem ~99 idiomas, mas oferecer todos só empurra o
 * usuário para uma escolha ruim — estes são os de acurácia alta comprovada.
 */
export const AUDIO_LANGUAGES = [
  { code: 'auto', labelKey: 'settings.audioLanguageAuto' },
  { code: 'pt', label: 'Português' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
] as const;

export type AudioLanguage = (typeof AUDIO_LANGUAGES)[number]['code'];

function detectAppLanguage(): AppLanguage {
  const stored = localStorage.getItem('openear:appLanguage');
  if (APP_LANGUAGES.some((l) => l.code === stored)) return stored as AppLanguage;

  const nav = navigator.language.toLowerCase();
  if (nav.startsWith('pt')) return 'pt-BR';
  if (nav.startsWith('es')) return 'es';
  return 'en';
}

void i18next.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectAppLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // o React já escapa
  returnEmptyString: false,
});

export default i18next;
