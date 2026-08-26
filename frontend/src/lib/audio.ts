/**
 * audio.ts — decodificação, reamostragem e empacotamento WAV.
 *
 * Por que 16 kHz mono: é a taxa nativa do Whisper. Mandar 48 kHz estéreo só
 * multiplica bytes sem ganhar precisão — e é o que estoura o limite de 25 MB da
 * Groq. Reamostrar aqui no navegador dispensa ffmpeg no servidor.
 *
 * WAV 16-bit mono @16 kHz = 32 KB/s ≈ 1,9 MB por minuto.
 */

export const TARGET_SAMPLE_RATE = 16_000;

/**
 * Margem sob o teto de corpo de requisição da função: 2 min dão ~3,8 MB, que
 * viram ~5,1 MB em base64 — abaixo dos 6 MB do Netlify, com ~15% de folga.
 *
 * O limite real da Groq é 25 MB — bem mais folgado. Quem aperta aqui é a função
 * serverless, não o modelo. Uma aula de 1h vira ~30 fatias em vez de 6, o que é
 * irrelevante frente às 2.000 requisições/dia do tier free.
 */
const MAX_CHUNK_SECONDS = 2 * 60;

/**
 * Decodifica qualquer formato que o navegador saiba abrir (mp3, m4a, wav, ogg,
 * webm, flac…) e devolve mono a 16 kHz.
 *
 * A reamostragem sai de graça: um OfflineAudioContext criado a 16 kHz reamostra
 * durante o render.
 */
export async function decodeToMono16k(file: Blob): Promise<Float32Array> {
  const bytes = await file.arrayBuffer();

  // Contexto temporário só para decodificar no sample rate original.
  const probe = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await probe.decodeAudioData(bytes.slice(0));
  } catch {
    throw new Error('Não conseguimos abrir esse arquivo de áudio. Tente MP3, WAV, M4A ou OGG.');
  } finally {
    void probe.close();
  }

  const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();

  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

/** Empacota PCM float [-1,1] em WAV 16-bit little-endian. */
export function encodeWav(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true); // tamanho do bloco fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits por amostra
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export interface AudioChunk {
  blob: Blob;
  index: number;
  total: number;
  startSeconds: number;
}

/**
 * Fatia áudio longo em pedaços que caibam no limite da API.
 *
 * O corte é feito no ponto mais silencioso de uma janela de 6 s em volta da
 * fronteira teórica, para não partir palavra no meio — cortar no meio de uma
 * sílaba faz o Whisper alucinar nas duas pontas.
 */
export function splitIntoChunks(samples: Float32Array, sampleRate = TARGET_SAMPLE_RATE): AudioChunk[] {
  const maxLen = MAX_CHUNK_SECONDS * sampleRate;
  if (samples.length <= maxLen) {
    return [{ blob: encodeWav(samples, sampleRate), index: 0, total: 1, startSeconds: 0 }];
  }

  const cuts: number[] = [0];
  while (cuts[cuts.length - 1] + maxLen < samples.length) {
    const target = cuts[cuts.length - 1] + maxLen;
    cuts.push(findQuietestPoint(samples, target, 3 * sampleRate));
  }
  cuts.push(samples.length);

  const total = cuts.length - 1;
  return Array.from({ length: total }, (_, i) => ({
    blob: encodeWav(samples.subarray(cuts[i], cuts[i + 1]), sampleRate),
    index: i,
    total,
    startSeconds: cuts[i] / sampleRate,
  }));
}

/** Ponto de menor energia numa janela ±radius em torno de `center`. */
function findQuietestPoint(samples: Float32Array, center: number, radius: number): number {
  const from = Math.max(0, center - radius);
  const to = Math.min(samples.length, center + radius);
  const window = Math.floor(0.02 * TARGET_SAMPLE_RATE); // 20 ms

  let best = center;
  let bestEnergy = Infinity;
  for (let i = from; i < to - window; i += window) {
    let energy = 0;
    for (let j = i; j < i + window; j++) energy += samples[j] * samples[j];
    if (energy < bestEnergy) {
      bestEnergy = energy;
      best = i + Math.floor(window / 2);
    }
  }
  return best;
}

export const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * Cabeçalho WAV canônico escrito por `encodeWav`: RIFF + fmt + data, sem chunks
 * extras. É constante justamente para `concatWav` poder pular direto ao PCM.
 */
export const WAV_HEADER_BYTES = 44;

/**
 * Cola vários WAV do MESMO formato num só, sem redecodificar.
 *
 * Existe para o modo ao vivo: a captura entrega um WAV a cada segmento de fala e
 * cada um carrega seu próprio cabeçalho de 44 bytes. Concatenar os arquivos
 * crus produziria um áudio que só toca o primeiro trecho — os cabeçalhos do meio
 * viram ruído. Aqui o cabeçalho do primeiro é reaproveitado (mesma taxa, mesmos
 * canais, mesma profundidade) com os dois campos de tamanho reescritos.
 *
 * Trabalha em bytes, não em Float32Array: o PCM já está em 16 bits, e reabrir
 * para float dobraria a memória de uma sessão longa sem mudar uma amostra.
 */
export async function concatWav(parts: Blob[]): Promise<Blob | null> {
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  const buffers = await Promise.all(parts.map((part) => part.arrayBuffer()));
  const bodies = buffers
    .filter((buffer) => buffer.byteLength > WAV_HEADER_BYTES)
    .map((buffer) => new Uint8Array(buffer, WAV_HEADER_BYTES));

  if (bodies.length === 0) return null;

  const dataBytes = bodies.reduce((total, body) => total + body.byteLength, 0);
  const out = new Uint8Array(WAV_HEADER_BYTES + dataBytes);
  out.set(new Uint8Array(buffers[0], 0, WAV_HEADER_BYTES), 0);

  let offset = WAV_HEADER_BYTES;
  for (const body of bodies) {
    out.set(body, offset);
    offset += body.byteLength;
  }

  // Os dois tamanhos que o cabeçalho declara e que a concatenação invalidou.
  const view = new DataView(out.buffer);
  view.setUint32(4, 36 + dataBytes, true); // RIFF: tudo depois deste campo
  view.setUint32(40, dataBytes, true); // data: só o PCM

  return new Blob([out], { type: 'audio/wav' });
}
