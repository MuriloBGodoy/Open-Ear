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
import { concatWav } from '../lib/audio';
import { transcribe } from '../lib/api';
import { useSettings, whisperLanguage } from '../context/SettingsContext';

/**
 * Teto de áudio retido em memória, em bytes.
 *
 * O WAV 16 bits mono a 16 kHz gasta 1,9 MB por minuto de FALA (os silêncios o
 * VAD já descarta), então 96 MB dão perto de 50 minutos de conversa. Acima
 * disso a aba começa a correr risco real em celular, e travar o app do usuário
 * para preservar uma gravação que ele talvez nem queira salvar é o pior negócio
 * possível: a transcrição é o produto, o áudio é o bônus.
 *
 * Estourou, para de guardar e AVISA — recortar em silêncio seria entregar uma
 * gravação que mente sobre a própria duração.
 */
const MAX_RETAINED_AUDIO_BYTES = 96 * 1024 * 1024;

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
  /** Bytes de áudio guardados. Zero = não há o que oferecer para salvar. */
  const [audioBytes, setAudioBytes] = useState(0);
  /** A gravação bateu no teto e está incompleta — a UI precisa dizer isso. */
  const [audioCapped, setAudioCapped] = useState(false);

  const captureRef = useRef<LiveCapture | null>(null);
  const seqRef = useRef(0);
  /**
   * Os WAV de cada segmento, na ordem em que foram capturados.
   *
   * Ficam num ref e não em estado porque nada na tela depende do conteúdo deles
   * — só de EXISTIREM, que é o que `hasAudio` diz. Guardá-los em estado faria a
   * lista inteira ser recriada a cada fala, num componente que já rerenderiza a
   * cada segmento transcrito.
   */
  const segmentsRef = useRef<Blob[]>([]);
  const retainedBytesRef = useRef(0);
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

      // Guarda ANTES de transcrever: o áudio é bom mesmo quando a API falha, e
      // uma sessão sem rede ainda pode virar arquivo salvo na biblioteca.
      if (retainedBytesRef.current + wav.size <= MAX_RETAINED_AUDIO_BYTES) {
        segmentsRef.current.push(wav);
        retainedBytesRef.current += wav.size;
        setAudioBytes(retainedBytesRef.current);
      } else {
        setAudioCapped(true);
      }

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
    segmentsRef.current = [];
    retainedBytesRef.current = 0;
    setAudioBytes(0);
    setAudioCapped(false);
  }, []);

  /**
   * Monta a gravação inteira num WAV só. Não limpa nada: quem salva pode querer
   * salvar de novo noutra pasta, e é `reset` que decide quando a sessão acaba.
   */
  const buildRecording = useCallback(() => concatWav(segmentsRef.current), []);

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
    audioBytes,
    audioCapped,
    buildRecording,
  };
}
