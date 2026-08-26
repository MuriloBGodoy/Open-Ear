/**
 * LevelMeter — prova visual de que o microfone está captando.
 *
 * Para o público deste app, este componente não é enfeite: é o substituto do
 * "eu escuto que está gravando". Sem ele, a pessoa não tem como saber se o
 * silêncio na tela é falta de fala ou microfone morto.
 *
 * O rótulo em texto não é redundância do desenho: barras dizem "tem som", e só
 * a palavra diz *o que* isso significa. Quem pediu menos animação no sistema
 * recebe as barras paradas, e aí o rótulo é a única informação que sobra.
 *
 * O RÓTULO FALA DE SINAL, NUNCA DE SESSÃO. O selo do painel logo acima já diz
 * Parado / Gravando / Pausado; se o medidor repetisse essas palavras, a coluna
 * mostraria "Pausado" duas vezes seguidas e a segunda linha não acrescentaria
 * nada. Aqui as frases são sobre o microfone: desligado, sem leitura, ouvindo,
 * captando fala.
 */

import { useTranslation } from 'react-i18next';

/**
 * Doze barras, não vinte e quatro. O medidor fica na coluna lateral de 300px:
 * com barra fina demais o movimento vira ruído visual em vez de sinal, e a
 * pessoa não consegue dizer se subiu ou desceu num relance.
 */
const BAR_COUNT = 12;

/** Pesos fixos (não aleatórios) para o medidor ter forma orgânica e estável. */
const WEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
  const center = (BAR_COUNT - 1) / 2;
  const distance = Math.abs(i - center) / center;
  return 0.45 + 0.55 * (1 - distance * distance);
});

interface LevelMeterProps {
  level: number;
  running: boolean;
  speaking: boolean;
  paused?: boolean;
}

export function LevelMeter({ level, running, speaking, paused = false }: LevelMeterProps) {
  const { t } = useTranslation();

  const state = !running ? 'idle' : paused ? 'paused' : speaking ? 'speaking' : 'live';
  const status = !running
    ? t('transcriber.meterOff')
    : paused
      ? t('transcriber.meterPaused')
      : speaking
        ? t('transcriber.statusSpeaking')
        : t('transcriber.statusListening');

  const active = running && !paused;

  return (
    <div className="meter" data-state={state}>
      <div className="meter__bars" aria-hidden="true">
        {WEIGHTS.map((weight, i) => {
          const amplitude = active ? Math.min(1, level * weight * 1.4) : 0;
          const on = amplitude > 0.06;
          return (
            <span
              key={i}
              className="meter__bar"
              data-on={on}
              style={{ height: `${amplitude * 100}%` }}
            />
          );
        })}
      </div>

      <span className="meter__status">
        <span className="dot" data-state={state} />
        {status}
      </span>

      {/* Explica o medidor a quem nunca viu, e explica a imobilidade a quem
          desligou animação — nesse caso as barras não são pista de nada. */}
      <p className="meter__hint">
        <span className="motion-only">{t('transcriber.meterHint')}</span>
        <span className="reduced-only">{t('transcriber.meterFrozen')}</span>
      </p>

      {/* O estado sonoro precisa chegar a quem usa leitor de tela também. */}
      <span className="sr-only" role="status">
        {status}
      </span>
    </div>
  );
}
