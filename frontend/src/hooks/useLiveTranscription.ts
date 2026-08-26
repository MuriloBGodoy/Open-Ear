/**
 * useLiveTranscription — orquestra captura ao vivo + transcrição.
 *
 * ORDEM IMPORTA: os segmentos são capturados em sequência, mas as respostas da
 * API podem voltar fora de ordem. Cada segmento entra na lista imediatamente
 * como placeholder e é preenchido quando resolve — assim a leitura nunca
 * embaralha e o usuário vê que algo está acontecendo.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LiveCapture } from '../lib/liveCapture';
import { transcribe } from '../lib/api';
import { useSettings, whisperLanguage } from '../context/SettingsContext';

export interface CaptionEntry {
  seq: number;
  text: string;
  status: 'pending' | 'done' | 'error';
  at: number;
  durationSeconds: number;
}

export function useLiveTranscription() {
  const { t } = useTranslation();
  const { audioLanguage } = useSettings();

  const [entries, setEntries] = useState<CaptionEntry[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [level, setLevel] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const captureRef = useRef<LiveCapture | null>(null);
  const seqRef = useRef(0);
  /** Últimas falas transcritas, usadas como prompt de contexto pro Whisper. */
  const contextRef = useRef<string>('');
  /**
   * O idioma escolhido em Ajustes vive num ref porque `handleSegment` é passado
   * ao LiveCapture uma única vez, no start. Sem o ref, trocar o idioma no meio
   * de uma sessão não teria efeito nos segmentos seguintes.
   */
  const languageRef = useRef(audioLanguage);
  useEffect(() => {
    languageRef.current = audioLanguage;
  }, [audioLanguage]);

  /**
   * O cronômetro conta tempo de captação, não tempo de tela: durante a pausa ele
   * congela. Se contasse a pausa, o número deixaria de bater com a duração do
   * áudio que foi de fato transcrito.
   */
  useEffect(() => {
    if (!running || paused) return;
    const id = window.setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [running, paused]);

  const handleSegment = useCallback(
    async (wav: Blob, durationSeconds: number) => {
      const seq = seqRef.current++;

      setEntries((prev) => [
        ...prev,
        { seq, text: '', status: 'pending', at: Date.now(), durationSeconds },
      ]);

      try {
        const result = await transcribe(wav, {
          mode: 'live',
          language: whisperLanguage(languageRef.current),
          prompt: contextRef.current,
        });

        const text = result.text;
        // Whisper às vezes devolve marcador de silêncio em trecho sem fala.
        const isNoise = !text || /^[\s.…]*$/.test(text) || /^\(.*\)$|^\[.*\]$/.test(text.trim());

        if (isNoise) {
          setEntries((prev) => prev.filter((e) => e.seq !== seq));
          return;
        }

        contextRef.current = `${contextRef.current} ${text}`.trim().slice(-800);
        setEntries((prev) => prev.map((e) => (e.seq === seq ? { ...e, text, status: 'done' } : e)));
      } catch (err) {
        const message = err instanceof Error ? err.message : t('errors.transcribeFailed');
        setError(message);
        setEntries((prev) =>
          prev.map((e) => (e.seq === seq ? { ...e, text: message, status: 'error' } : e))
        );
      }
    },
    [t]
  );

  const start = useCallback(async () => {
    setError(null);
    try {
      const capture = new LiveCapture({
        onSegment: handleSegment,
        onLevel: setLevel,
        onSpeaking: setSpeaking,
      });
      await capture.start();
      captureRef.current = capture;
      setRunning(true);
      setPaused(false);
      setElapsedSeconds(0);
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? t('errors.micDenied')
          : err instanceof Error
            ? err.message
            : t('errors.micFailed');
      setError(message);
      setRunning(false);
    }
  }, [handleSegment, t]);

  const stop = useCallback(async () => {
    await captureRef.current?.stop();
    captureRef.current = null;
    setRunning(false);
    setPaused(false);
    setLevel(0);
    setSpeaking(false);
  }, []);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      captureRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setEntries([]);
    setError(null);
    setElapsedSeconds(0);
    seqRef.current = 0;
    contextRef.current = '';
  }, []);

  // Solta o microfone se o componente sair de cena com a captura ligada.
  useEffect(() => {
    return () => {
      void captureRef.current?.stop();
    };
  }, []);

  const fullText = entries
    .filter((e) => e.status === 'done')
    .map((e) => e.text)
    .join(' ');

  return {
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
  };
}
