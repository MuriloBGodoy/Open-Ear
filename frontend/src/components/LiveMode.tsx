/**
 * LiveMode — legenda de conversa ao vivo.
 *
 * É o modo principal do app: alguém fala perto do dispositivo e o texto aparece
 * na tela em poucos segundos. Todo o resto é secundário.
 *
 * DUAS COLUNAS, E A LEITURA FICA COM A MAIOR. Em tela larga o controle (gravar,
 * pausar, cronômetro, medidor) vai para uma coluna estreita à direita e a fala
 * ocupa o resto. O motivo não é estético: se o painel de controle ficar acima do
 * texto, cada fala nova empurra a leitura para baixo da dobra.
 *
 * A ÚLTIMA FALA É MARCADA POR COR, NUNCA POR TAMANHO. Aumentar a fonte da última
 * linha reflui tudo que está acima a cada segmento novo — e se o texto se move, a
 * pessoa perde o lugar onde estava lendo. Cor, borda e um rótulo resolvem sem
 * mexer uma linha de lugar.
 */

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { useSettings } from '../context/SettingsContext';
import { LevelMeter } from './LevelMeter';
import { IconCheck, IconCopy, IconMic, IconPause, IconSave, IconStop } from './Icons';
import { deriveTitle, saveSession } from '../lib/db';

interface LiveModeProps {
  onSaved: () => void;
}

/** mm:ss — cronômetro é para conferir de relance, não para calcular. */
function clock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function LiveMode({ onSaved }: LiveModeProps) {
  const { t } = useTranslation();
  const { formatTime } = useSettings();
  const {
    entries,
    running,
    paused,
    level,
    speaking,
    elapsedSeconds,
    error,
    start,
    stop,
    togglePause,
    reset,
    fullText,
    setError,
  } = useLiveTranscription();
  const [copied, setCopied] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number>(0);

  // A última fala precisa estar sempre visível: numa conversa a pessoa não tem
  // mão livre nem tempo para rolar a tela.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [entries]);

  const handleToggle = async () => {
    if (running) {
      await stop();
      return;
    }
    startedAtRef.current = Date.now();
    reset();
    await start();
  };

  const handleSave = async () => {
    if (!fullText) return;
    await saveSession({
      mode: 'live',
      text: fullText,
      title: deriveTitle(fullText, t('transcriber.tabLive')),
      durationSeconds: elapsedSeconds,
    });
    onSaved();
    reset();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lastSeq = entries.length ? entries[entries.length - 1].seq : -1;

  return (
    <>
      {error && (
        <div className="notice notice--error" role="alert">
          <div>
            <strong>{t('errors.somethingWrong')}</strong>
            <div>{error}</div>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setError(null)}>
            {t('common.ok')}
          </button>
        </div>
      )}

      <div className="stage">
        {/* --------------------------------------------------------- a leitura */}
        <section className="card stage__read" aria-label={t('transcriber.transcript')}>
          <div className="row row--between">
            <h2 className="card__title">{t('transcriber.transcript')}</h2>
            {fullText && (
              <div className="row">
                <button type="button" className="btn btn--ghost" onClick={handleCopy}>
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                  {copied ? t('common.copied') : t('common.copy')}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={handleSave}
                  disabled={running}
                >
                  <IconSave size={18} />
                  {t('common.save')}
                </button>
              </div>
            )}
          </div>

          {/**
           * aria-live="polite" para o leitor de tela anunciar cada fala nova sem
           * atropelar o que a pessoa já está lendo.
           */}
          <div className="transcript bubbles" aria-live="polite" aria-atomic="false">
            {entries.length === 0 ? (
              <p className="empty">
                {running ? t('transcriber.listeningHint') : t('transcriber.nothingYet')}
              </p>
            ) : (
              entries.map((entry) => {
                const isLast = entry.seq === lastSeq;
                return (
                  <article
                    key={entry.seq}
                    className="bubble"
                    data-status={entry.status}
                    data-last={isLast}
                  >
                    <p className="bubble__text">
                      {entry.status === 'pending' ? t('transcriber.transcribing') : entry.text}
                    </p>
                    <p className="bubble__meta">
                      <time dateTime={new Date(entry.at).toISOString()}>
                        {formatTime(entry.at)}
                      </time>
                      {isLast && entry.status === 'done' && (
                        <span className="tag tag--ok">{t('transcriber.lastLine')}</span>
                      )}
                    </p>
                  </article>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {!running && entries.length === 0 && <p className="hint">{t('transcriber.hintIdle')}</p>}
        </section>

        {/* -------------------------------------------------------- o controle */}
        <aside className="stage__side">
          <div className="panel" data-recording={running && !paused}>
            <div className="panel__head">
              <span className="badge" data-state={running ? (paused ? 'paused' : 'live') : 'idle'}>
                <span className="dot" data-state={running && !paused ? 'live' : 'idle'} />
                {running
                  ? paused
                    ? t('transcriber.statusPaused')
                    : t('transcriber.recording')
                  : t('transcriber.statusIdle')}
              </span>
              {/* O cronômetro é monoespaçado para o número não dançar a cada segundo. */}
              <span className="clock" aria-label={t('transcriber.elapsed')}>
                {clock(elapsedSeconds)}
              </span>
            </div>

            <LevelMeter level={level} running={running} speaking={speaking} paused={paused} />

            <div className="panel__actions">
              <button
                type="button"
                className="btn btn--primary btn--record"
                data-recording={running}
                onClick={handleToggle}
              >
                {running ? <IconStop size={26} /> : <IconMic size={26} />}
                {running ? t('transcriber.stop') : t('transcriber.start')}
              </button>

              {/**
               * Pausar só existe gravando. Fora disso seria um botão morto
               * ocupando espaço e roubando a tabulação de quem usa teclado.
               */}
              {running && (
                <button type="button" className="btn btn--ghost" onClick={togglePause}>
                  {paused ? <IconMic size={18} /> : <IconPause size={18} />}
                  {paused ? t('transcriber.resume') : t('transcriber.pause')}
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
