/**
 * Settings — leitura, idioma, região e aparência.
 *
 * A ORDEM DAS SEÇÕES É A DECISÃO MAIS IMPORTANTE DESTA TELA. "Leitura" vem
 * primeiro porque tamanho de texto é o ajuste que faz o app funcionar ou não para
 * quem chegou aqui — não é preferência de gosto, é a diferença entre ler a
 * conversa e desistir. Idioma vem depois; aparência e privacidade no fim.
 *
 * Duas coisas que parecem detalhe e não são:
 *
 * 1. Idioma do app e idioma do áudio são campos separados. Uma pessoa surda no
 *    Brasil pode querer a interface em português e legendar uma reunião em inglês.
 *    Um seletor só quebraria justamente esse caso.
 * 2. O tamanho do texto tem amostra ao vivo. Escolher "grande" no abstrato não
 *    diz nada; ver a frase mudando de tamanho na hora, sim.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  APP_LANGUAGES,
  AUDIO_LANGUAGES,
  REGIONS,
  type AppLanguage,
  type AudioLanguage,
  type Region,
} from '../i18n';
import { TEXT_SIZES, useSettings, type Theme } from '../context/SettingsContext';
import { clearAll } from '../lib/db';
import { ScreenHeader } from '../components/ScreenHeader';
import { IconTrash } from '../components/Icons';

const THEMES: { value: Theme; key: string }[] = [
  { value: 'light', key: 'settings.themeLight' },
  { value: 'dark', key: 'settings.themeDark' },
  { value: 'system', key: 'settings.themeSystem' },
];

export function Settings({ onCleared }: { onCleared: () => void }) {
  const { t } = useTranslation();
  const {
    appLanguage,
    setAppLanguage,
    audioLanguage,
    setAudioLanguage,
    region,
    setRegion,
    textSizeIndex,
    setTextSizeIndex,
    theme,
    setTheme,
  } = useSettings();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <ScreenHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      {/* ------------------------------------------------------------ leitura */}
      <section className="card" aria-labelledby="s-read">
        <h2 className="card__title" id="s-read">
          {t('settings.sectionReading')}
        </h2>

        <fieldset className="field field--fieldset">
          <legend className="field__label">{t('settings.textSize')}</legend>
          <p className="field__hint">{t('settings.textSizeHint')}</p>

          {/**
           * Escolha direta, não um par de botões A− / A+. O stepper obrigava a
           * pessoa a adivinhar quantos toques faltam e não dizia onde ela está; os
           * cinco tamanhos visíveis de uma vez transformam isso em uma escolha só.
           * Os números são o rótulo em pixel, porque "grande" não quer dizer nada.
           */}
          <div className="seg" role="radiogroup" aria-label={t('settings.textSize')}>
            {TEXT_SIZES.map((rem, i) => {
              const px = Math.round(rem * 16);
              return (
                <label key={px} className="seg__opt" data-selected={i === textSizeIndex}>
                  <input
                    type="radio"
                    name="text-size"
                    className="sr-only"
                    value={px}
                    checked={i === textSizeIndex}
                    onChange={() => setTextSizeIndex(i)}
                  />
                  <span aria-hidden="true">{px}</span>
                  {/* O número sozinho não diz "pixels" para leitor de tela. */}
                  <span className="sr-only">{t('settings.textSizePxLabel', { px })}</span>
                </label>
              );
            })}
          </div>

          <div className="transcript transcript--sample">
            <p className="transcript__line">{t('settings.textSizeSample')}</p>
          </div>
        </fieldset>
      </section>

      {/* -------------------------------------------------- idioma e região */}
      <section className="card" aria-labelledby="s-lang">
        <h2 className="card__title" id="s-lang">
          {t('settings.sectionLanguage')}
        </h2>

        <div className="field field--split">
          <div className="field__main">
            <label className="field__label" htmlFor="app-language">
              {t('settings.appLanguage')}
            </label>
            <p className="field__hint" id="app-language-hint">
              {t('settings.appLanguageHint')}
            </p>
          </div>
          <select
            id="app-language"
            className="select"
            value={appLanguage}
            aria-describedby="app-language-hint"
            onChange={(e) => setAppLanguage(e.target.value as AppLanguage)}
          >
            {APP_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field field--split">
          <div className="field__main">
            <label className="field__label" htmlFor="audio-language">
              {t('settings.audioLanguage')}
            </label>
            <p className="field__hint" id="audio-language-hint">
              {t('settings.audioLanguageHint')}
            </p>
          </div>
          <select
            id="audio-language"
            className="select"
            value={audioLanguage}
            aria-describedby="audio-language-hint"
            onChange={(e) => setAudioLanguage(e.target.value as AudioLanguage)}
          >
            {AUDIO_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {'label' in l ? l.label : t(l.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div className="field field--split">
          <div className="field__main">
            <label className="field__label" htmlFor="region">
              {t('settings.region')}
            </label>
            <p className="field__hint" id="region-hint">
              {t('settings.regionHint')}
            </p>
          </div>
          <select
            id="region"
            className="select"
            value={region}
            aria-describedby="region-hint"
            onChange={(e) => setRegion(e.target.value as Region)}
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* --------------------------------------------------------- aparência */}
      <section className="card" aria-labelledby="s-look">
        <h2 className="card__title" id="s-look">
          {t('settings.sectionAppearance')}
        </h2>

        {/**
         * Três estados, não um interruptor. "Seguir o sistema" é um valor de
         * verdade — e é o default — e um toggle de duas posições não tem como
         * representá-lo sem mentir sobre o que está ligado.
         */}
        <fieldset className="field field--fieldset">
          <legend className="field__label">{t('settings.theme')}</legend>
          <p className="field__hint">{t('settings.themeHint')}</p>
          <div className="chips">
            {THEMES.map((option) => (
              <label key={option.value} className="chip" data-selected={theme === option.value}>
                <input
                  type="radio"
                  name="theme"
                  className="sr-only"
                  value={option.value}
                  checked={theme === option.value}
                  onChange={() => setTheme(option.value)}
                />
                {t(option.key)}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      {/* -------------------------------------------------------- privacidade */}
      <section className="card" aria-labelledby="s-priv">
        <h2 className="card__title" id="s-priv">
          {t('settings.sectionPrivacy')}
        </h2>
        <p className="field__hint">{t('settings.privacyText')}</p>

        {confirming ? (
          <div className="notice notice--warn" role="alertdialog" aria-label={t('settings.clearData')}>
            <div>{t('settings.clearDataConfirm')}</div>
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
                {t('common.cancel')}
              </button>
              <button
                type="button"
                className="btn btn--danger-solid"
                onClick={() => {
                  void clearAll().then(() => {
                    setConfirming(false);
                    onCleared();
                  });
                }}
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--ghost btn--danger"
            onClick={() => setConfirming(true)}
            style={{ marginTop: 'var(--s-3)' }}
          >
            <IconTrash size={18} />
            {t('settings.clearData')}
          </button>
        )}
      </section>
    </>
  );
}
