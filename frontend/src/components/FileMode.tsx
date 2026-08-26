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
import {
  addLibraryBlob,
  createFolder,
  markFileTranscribed,
  saveSession,
  type LibraryFolder,
} from '../lib/db';
import { useSettings, whisperLanguage } from '../context/SettingsContext';
import { SaveToLibrary, type SaveTarget } from './SaveToLibrary';
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
  folders: LibraryFolder[];
  /** Uma pasta criada aqui precisa aparecer na biblioteca sem recarregar. */
  onFoldersChanged: () => void;
}

type Phase = 'idle' | 'decoding' | 'transcribing' | 'done';

export function FileMode({
  onSaved,
  incoming,
  onConsumed,
  folders,
  onFoldersChanged,
}: FileModeProps) {
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
  const [target, setTarget] = useState<SaveTarget>({ enabled: false, folderId: null });
  const inputRef = useRef<HTMLInputElement>(null);
  /** Id do arquivo da biblioteca sendo transcrito, para marcar como feito ao salvar. */
  const libraryIdRef = useRef<string | null>(null);
  /**
   * O áudio de origem, para poder guardá-lo na biblioteca depois.
   *
   * É o Blob ORIGINAL, não o PCM 16 kHz que foi mandado para a API: aquele é uma
   * versão degradada, feita para caber no limite de upload. Quem guarda um áudio
   * quer o áudio, não a cópia que serviu para transcrever.
   */
  const sourceRef = useRef<{ blob: Blob; name: string } | null>(null);

  const run = useCallback(
    async (blob: Blob, name: string, libraryId: string | null = null) => {
      setError(null);
      setText('');
      setProgress(0);
      setFileName(name);
      libraryIdRef.current = libraryId;
      sourceRef.current = { blob, name };
      // Áudio que já veio da biblioteca não precisa ser guardado de novo.
      setTarget({ enabled: false, folderId: null });
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

    if (libraryIdRef.current) {
      await markFileTranscribed(libraryIdRef.current, session.id);
    } else if (target.enabled && sourceRef.current) {
      /**
       * Guarda o áudio JÁ ligado à sessão que ele acabou de gerar. Salvar solto e
       * deixar a ligação para depois faria o arquivo nascer marcado como "na
       * fila" na biblioteca — um áudio que a pessoa acabou de ver ser transcrito.
       */
      const record = await addLibraryBlob(
        sourceRef.current.blob,
        sourceRef.current.name,
        target.folderId ?? undefined
      );
      await markFileTranscribed(record.id, session.id);
    }

    onSaved();
    setText('');
    setPhase('idle');
    setFileName('');
    libraryIdRef.current = null;
    sourceRef.current = null;
    setTarget({ enabled: false, folderId: null });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateFolder = async (name: string) => {
    const folder = await createFolder(name);
    onFoldersChanged();
    return folder.id;
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

          {/**
           * Só para áudio que ainda NÃO está na biblioteca. Quem chegou aqui pelo
           * botão "transcrever" da biblioteca já tem o arquivo guardado — oferecer
           * de novo criaria uma segunda cópia do mesmo áudio no dispositivo.
           */}
          {!libraryIdRef.current && sourceRef.current && (
            <SaveToLibrary
              sizeBytes={sourceRef.current.blob.size}
              folders={folders}
              value={target}
              onChange={setTarget}
              onCreateFolder={handleCreateFolder}
              disabled={busy}
            />
          )}
        </div>
      )}
    </>
  );
}
