/**
 * FileMode — transcrição de arquivo de áudio.
 *
 * O arquivo é decodificado, reamostrado para 16 kHz mono e fatiado NO NAVEGADOR
 * antes de subir. Isso resolve de uma vez o limite de 25 MB da Groq e o timeout
 * de requisição — e dispensa ffmpeg no servidor.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { decodeToMono16k, splitIntoChunks, formatDuration, TARGET_SAMPLE_RATE } from '../lib/audio';
import { transcribe } from '../lib/api';
import { markFileTranscribed, saveSession } from '../lib/db';
import { useSettings, whisperLanguage } from '../context/SettingsContext';
import { IconCheck, IconCopy, IconFile, IconSave } from './Icons';

/** Áudio vindo da biblioteca, já escolhido pelo usuário na outra tela. */
export interface IncomingAudio {
  id: string;
  name: string;
  blob: Blob;
}

interface FileModeProps {
  onSaved: () => void;
  incoming?: IncomingAudio | null;
  /** Chamado depois de consumir `incoming`, para limpar o parâmetro da rota. */
  onConsumed?: () => void;
}

type Phase = 'idle' | 'decoding' | 'transcribing' | 'done';

export function FileMode({ onSaved, incoming, onConsumed }: FileModeProps) {
  const { t } = useTranslation();
  const { audioLanguage } = useSettings();

  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [duration, setDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Id do arquivo da biblioteca sendo transcrito, para marcar como feito ao salvar. */
  const libraryIdRef = useRef<string | null>(null);

  const run = useCallback(
    async (blob: Blob, name: string, libraryId: string | null = null) => {
      setError(null);
      setText('');
      setProgress(0);
      setFileName(name);
      libraryIdRef.current = libraryId;
      setPhase('decoding');

      try {
        const samples = await decodeToMono16k(blob);
        const seconds = samples.length / TARGET_SAMPLE_RATE;
        setDuration(seconds);

        const chunks = splitIntoChunks(samples);
        setPhase('transcribing');

        const parts: string[] = [];
        for (const chunk of chunks) {
          // Sequencial de propósito: o texto anterior serve de contexto para o
          // Whisper acertar nomes próprios e não perder o fio da conversa.
          const result = await transcribe(chunk.blob, {
            mode: 'file',
            language: whisperLanguage(audioLanguage),
            prompt: parts.join(' '),
          });
          parts.push(result.text);
          setText(parts.join('\n\n'));
          setProgress(((chunk.index + 1) / chunk.total) * 100);
        }

        setPhase('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errors.fileOpenFailed'));
        setPhase('idle');
      }
    },
    [audioLanguage, t]
  );

  // Chegou da biblioteca: começa sozinho. A pessoa já disse "transcrever" lá —
  // pedir um segundo clique aqui seria repetir a decisão dela.
  useEffect(() => {
    if (!incoming) return;
    void run(incoming.blob, incoming.name, incoming.id);
    onConsumed?.();
    // `run` e `onConsumed` são estáveis; reagir só ao arquivo que chegou.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incoming?.id]);

  const handleSave = async () => {
    if (!text) return;
    const session = await saveSession({
      mode: 'file',
      text,
      durationSeconds: Math.round(duration),
      title: fileName,
    });
    if (libraryIdRef.current) await markFileTranscribed(libraryIdRef.current, session.id);
    onSaved();
    setText('');
    setPhase('idle');
    setFileName('');
    libraryIdRef.current = null;
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const busy = phase === 'decoding' || phase === 'transcribing';

  return (
    <>
      <div
        className="drop"
        data-over={dragOver}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void run(file, file.name);
        }}
      >
        <IconFile size={30} className="drop__icon" />
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
        >
          {t('transcriber.chooseFile')}
        </button>
        <p className="hint">{t('transcriber.dropHint')}</p>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,video/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void run(file, file.name);
            e.target.value = '';
          }}
        />
      </div>

      {busy && (
        <div className="card">
          <div className="row row--between" style={{ marginBottom: 'var(--s-3)' }}>
            <strong>{fileName}</strong>
            <span className="meta">
              {phase === 'decoding'
                ? t('transcriber.preparing')
                : t('transcriber.transcribingPercent', { percent: Math.round(progress) })}
            </span>
          </div>
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={phase === 'decoding' ? 0 : Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('transcriber.progressLabel')}
          >
            <div
              className="progress__fill"
              style={{ width: `${phase === 'decoding' ? 6 : progress}%` }}
            />
          </div>
          {duration > 0 && (
            <p className="hint">
              {t('transcriber.duration', { duration: formatDuration(duration) })}
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="notice notice--error" role="alert">
          <div>
            <strong>{t('errors.transcribeFailed')}</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {text && (
        <div className="card">
          <div className="row row--between">
            <h2 className="card__title">{fileName || t('transcriber.transcript')}</h2>
            <div className="row">
              <button type="button" className="btn btn--ghost" onClick={handleCopy}>
                {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                {copied ? t('common.copied') : t('common.copy')}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={handleSave}
                disabled={busy}
              >
                <IconSave size={18} />
                {t('common.save')}
              </button>
            </div>
          </div>
          <div className="transcript">
            {text.split('\n\n').map((paragraph, i) => (
              <p key={i} className="transcript__line">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
