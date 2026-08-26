/**
 * liveCapture.ts — captura do microfone segmentada por pausa natural da fala.
 *
 * POR QUE NÃO MediaRecorder EM CHUNKS:
 * o MediaRecorder só coloca cabeçalho no primeiro fragmento; os seguintes não
 * são decodificáveis sozinhos. E reiniciá-lo a cada N segundos corta no meio da
 * palavra — o Whisper alucina feio nas duas pontas de um corte assim.
 *
 * ESTRATÉGIA:
 * captura PCM cru via AudioWorklet, mede energia a cada 8 ms e fecha o segmento
 * quando detecta uma pausa real na fala. Cada segmento sai como WAV completo e
 * independente, cortado onde a pessoa já parou de falar.
 *
 * Isso dá legenda quase ao vivo (latência = pausa + ~0,5 s de rede) com texto
 * bem melhor do que fatiar por relógio.
 */

import { encodeWav, TARGET_SAMPLE_RATE } from './audio';

/** Módulo do worklet embutido — evita ter que servir um arquivo separado. */
const WORKLET_SOURCE = `
class PcmCollector extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (channel && channel.length) this.port.postMessage(channel.slice());
    return true;
  }
}
registerProcessor('pcm-collector', PcmCollector);
`;

export interface LiveCaptureOptions {
  /** Dispara quando um segmento de fala fecha e está pronto para transcrever. */
  onSegment: (wav: Blob, durationSeconds: number) => void;
  /** Nível de entrada 0..1, ~a cada 8 ms — use para o medidor visual. */
  onLevel?: (level: number) => void;
  /** Sinaliza se há fala detectada agora (para feedback visual). */
  onSpeaking?: (speaking: boolean) => void;
}

/** Silêncio contínuo que fecha o segmento. Curto demais fragmenta a frase. */
const SILENCE_MS_TO_FLUSH = 700;
/** Menos que isso quase sempre é tosse, batida na mesa ou ruído. */
const MIN_SPEECH_MS = 900;
/** Teto de segurança para quem fala sem pausar. */
const MAX_SEGMENT_MS = 14_000;
/** Guarda áudio antes do início da fala para não cortar a primeira consoante. */
const PREROLL_MS = 250;

export class LiveCapture {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;

  private buffers: Float32Array[] = [];
  private bufferedSamples = 0;
  private preroll: Float32Array[] = [];
  private prerollSamples = 0;

  private speaking = false;
  private silenceMs = 0;
  private speechMs = 0;
  private noiseFloor = 0.004;
  private paused = false;

  private sampleRate = TARGET_SAMPLE_RATE;
  private readonly options: LiveCaptureOptions;

  constructor(options: LiveCaptureOptions) {
    this.options = options;
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Pedir 16 kHz direto evita reamostrar depois. Safari pode ignorar — tratado no flush.
    this.ctx = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
    this.sampleRate = this.ctx.sampleRate;

    const blobUrl = URL.createObjectURL(new Blob([WORKLET_SOURCE], { type: 'application/javascript' }));
    try {
      await this.ctx.audioWorklet.addModule(blobUrl);
    } finally {
      URL.revokeObjectURL(blobUrl);
    }

    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, 'pcm-collector');
    this.node.port.onmessage = (event) => this.consume(event.data as Float32Array);

    this.source.connect(this.node);
    // Sem destino o worklet não é agendado em alguns navegadores; ganho zero
    // garante que nada é reproduzido de volta (evitaria eco).
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute).connect(this.ctx.destination);
  }

  /**
   * Pausa sem soltar o microfone. Descartar os quadros é de propósito: parar o
   * MediaStream faria alguns navegadores pedirem permissão de novo na retomada,
   * e uma pausa que custa um diálogo de permissão não serve para o meio de uma
   * conversa. Ao pausar, o que já estava no buffer é entregue — senão a última
   * frase dita antes do toque no botão desapareceria.
   */
  setPaused(paused: boolean): void {
    if (paused === this.paused) return;
    this.paused = paused;

    if (paused) {
      if (this.speaking) {
        this.speaking = false;
        this.options.onSpeaking?.(false);
      }
      this.flush();
      this.preroll = [];
      this.prerollSamples = 0;
      this.options.onLevel?.(0);
    }
  }

  private consume(frame: Float32Array): void {
    if (this.paused) return;

    const frameMs = (frame.length / this.sampleRate) * 1000;

    let sumSquares = 0;
    for (let i = 0; i < frame.length; i++) sumSquares += frame[i] * frame[i];
    const rms = Math.sqrt(sumSquares / frame.length);

    this.options.onLevel?.(Math.min(1, rms * 12));

    // Piso de ruído adaptativo: sobe devagar em ambiente barulhento, então o
    // limiar acompanha o café movimentado em vez de disparar sem parar.
    const threshold = Math.max(0.008, this.noiseFloor * 3.2);
    const isSpeech = rms > threshold;
    if (!isSpeech) this.noiseFloor = this.noiseFloor * 0.97 + rms * 0.03;

    if (isSpeech) {
      if (!this.speaking) {
        this.speaking = true;
        this.options.onSpeaking?.(true);
        // Entra com o pré-roll para não perder o ataque da palavra.
        this.buffers.push(...this.preroll);
        this.bufferedSamples += this.prerollSamples;
        this.preroll = [];
        this.prerollSamples = 0;
      }
      this.silenceMs = 0;
      this.speechMs += frameMs;
      this.buffers.push(frame);
      this.bufferedSamples += frame.length;
    } else if (this.speaking) {
      // Ainda dentro do segmento: silêncio curto é pausa, não fim de frase.
      this.silenceMs += frameMs;
      this.buffers.push(frame);
      this.bufferedSamples += frame.length;

      if (this.silenceMs >= SILENCE_MS_TO_FLUSH) {
        this.speaking = false;
        this.options.onSpeaking?.(false);
        this.flush();
      }
    } else {
      // Fora de fala: mantém só uma janela curta de pré-roll.
      this.preroll.push(frame);
      this.prerollSamples += frame.length;
      const maxPreroll = (PREROLL_MS / 1000) * this.sampleRate;
      while (this.prerollSamples > maxPreroll && this.preroll.length > 1) {
        this.prerollSamples -= this.preroll.shift()!.length;
      }
    }

    const bufferedMs = (this.bufferedSamples / this.sampleRate) * 1000;
    if (bufferedMs >= MAX_SEGMENT_MS) this.flush();
  }

  /** Fecha o segmento atual e o entrega, se tiver fala suficiente. */
  flush(): void {
    const hadEnoughSpeech = this.speechMs >= MIN_SPEECH_MS;
    const buffers = this.buffers;
    const totalSamples = this.bufferedSamples;

    this.buffers = [];
    this.bufferedSamples = 0;
    this.speechMs = 0;
    this.silenceMs = 0;

    if (!hadEnoughSpeech || totalSamples === 0) return;

    const merged = new Float32Array(totalSamples);
    let offset = 0;
    for (const b of buffers) {
      merged.set(b, offset);
      offset += b.length;
    }

    const pcm =
      this.sampleRate === TARGET_SAMPLE_RATE
        ? merged
        : resampleLinear(merged, this.sampleRate, TARGET_SAMPLE_RATE);

    this.options.onSegment(encodeWav(pcm, TARGET_SAMPLE_RATE), pcm.length / TARGET_SAMPLE_RATE);
  }

  async stop(): Promise<void> {
    this.paused = false;
    this.flush();
    this.node?.port.close();
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();

    this.node = null;
    this.source = null;
    this.stream = null;
    this.ctx = null;
    this.speaking = false;
    this.preroll = [];
    this.prerollSamples = 0;
    this.options.onSpeaking?.(false);
    this.options.onLevel?.(0);
  }
}

/** Reamostragem linear — só usada quando o navegador ignora o sampleRate pedido. */
function resampleLinear(input: Float32Array, from: number, to: number): Float32Array {
  if (from === to) return input;
  const ratio = from / to;
  const out = new Float32Array(Math.floor(input.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    out[i] = (input[idx] ?? 0) * (1 - frac) + (input[idx + 1] ?? input[idx] ?? 0) * frac;
  }
  return out;
}
