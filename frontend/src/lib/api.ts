/**
 * api.ts — cliente do backend de transcrição.
 *
 * A chave da Groq vive só no backend. O front nunca a vê.
 */

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptSegment[];
}

interface TranscribeOptions {
  mode?: 'live' | 'file';
  /** Código ISO-639-1. `undefined` deixa o Whisper detectar sozinho. */
  language?: string;
  /** Contexto para o Whisper: nomes próprios, jargão, o texto já transcrito. */
  prompt?: string;
  signal?: AbortSignal;
}

export async function transcribe(audio: Blob, options: TranscribeOptions = {}): Promise<TranscriptionResult> {
  const { mode = 'file', language, prompt, signal } = options;

  const form = new FormData();
  form.append('file', audio, mode === 'live' ? 'segment.wav' : 'audio.wav');
  form.append('mode', mode);
  // Sem o campo, o backend não manda `language` e a Groq detecta o idioma.
  if (language) form.append('language', language);
  if (prompt) form.append('prompt', prompt.slice(-800)); // Whisper aceita ~224 tokens de prompt

  const response = await fetch('/api/transcribe', { method: 'POST', body: form, signal });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload as { error?: string; upstream?: string } | null)?.error ??
      `Falha na transcrição (HTTP ${response.status}).`;
    const upstream = (payload as { upstream?: string } | null)?.upstream;
    throw new Error(upstream ? `${message} (${upstream})` : message);
  }

  const data = payload as { text?: string; segments?: TranscriptSegment[] } | null;
  return {
    text: (data?.text ?? '').trim(),
    segments: data?.segments ?? [],
  };
}

export interface HealthStatus {
  ok: boolean;
  model: string;
  groqConfigured: boolean;
}

/**
 * Três respostas, não duas — a diferença importa para o que a tela mostra.
 *
 * - `HealthStatus` — a função respondeu.
 * - `null` — servidor inalcançável de verdade: sem rede, função caída, 5xx. É o
 *   único caso em que o usuário precisa ser avisado.
 * - `'no-api'` — o front está sendo servido por algo que não executa funções. No
 *   `npm run dev` o Vite não conhece `/api/health` e devolve o próprio
 *   `index.html`: HTTP 200, `content-type: text/html`. Sem esta distinção, um
 *   200 com HTML explodia no `res.json()` e virava "servidor fora do ar" — alarme
 *   falso, e o mais barulhento da tela.
 *
 * Em produção este terceiro caso não acontece: o Netlify roteia `/api/*` para a
 * função ou responde 404, e não há `[[redirects]]` de catch-all para a SPA
 * (o roteamento é por hash, então nenhum é necessário).
 */
export async function checkHealth(): Promise<HealthStatus | 'no-api' | null> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) return null;
    if (!res.headers.get('content-type')?.includes('application/json')) return 'no-api';
    return (await res.json()) as HealthStatus;
  } catch {
    return null;
  }
}
