/**
 * transcribe.mts — proxy de transcrição.
 *
 * Existe por um motivo só: **a chave da Groq não pode ir para o cliente.**
 * Recebe o áudio, encaminha, devolve o texto e não guarda nada.
 */

import type { Config } from '@netlify/functions';
// Extensão explícita: assim o arquivo roda tanto no bundler do Netlify quanto
// direto no Node (que faz type stripping, mas não resolve extensão sozinho).
import { MODEL, json, messageFor, safeUpstream } from '../lib/groq.mts';

/**
 * O Netlify anuncia 6 MB de payload, mas corpo binário trafega em base64 — uns
 * 30% a mais — então o teto real para áudio fica perto de 4,5 MB. O cliente já
 * fatia em 2 min (~3,8 MB) antes de chegar aqui; esta guarda existe para dar
 * erro legível em vez de um 413 opaco da plataforma, e para valer também em dev.
 */
const MAX_UPLOAD_BYTES = 4.5 * 1024 * 1024;

/**
 * A Groq transcreve a ~228x real-time — uma fatia de 2 min volta em segundos.
 * A folga aqui é para rede ruim, e fica abaixo do teto de execução síncrona do
 * Netlify (60s) para que o estouro vire 504 legível em vez de a função ser
 * morta pela plataforma.
 */
const UPSTREAM_TIMEOUT_MS = 50_000;

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const key = process.env.GROQ_API_KEY;
  if (!key) return json({ error: 'GROQ_API_KEY não configurada no backend.' }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: 'Requisição inválida: esperava multipart/form-data.' }, 400);
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0)
    return json({ error: 'Nenhum áudio recebido.' }, 400);

  if (file.size > MAX_UPLOAD_BYTES)
    return json(
      {
        error: `Áudio de ${(file.size / 1_048_576).toFixed(1)} MB excede o limite de 4,5 MB. Fatie antes de enviar.`,
      },
      413,
    );

  // "live" = chunk curto de conversa ao vivo; queremos só o texto, o mais rápido
  // possível. `verbose_json` traz os tempos, que o modo Arquivo usa.
  const isLive = asText(form.get('mode')) === 'live';
  // Ausente de propósito = o usuário escolheu detecção automática. Não chutamos
  // "pt": forçar o idioma errado é pior que deixar o modelo detectar.
  const language = asText(form.get('language'));
  const prompt = asText(form.get('prompt'));

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'audio.wav');
  upstream.append('model', MODEL);
  if (language) upstream.append('language', language);
  upstream.append('response_format', isLive ? 'json' : 'verbose_json');
  // temperature 0 = menos alucinação em trecho curto/silencioso
  upstream.append('temperature', '0');
  if (prompt) upstream.append('prompt', prompt);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}` },
      body: upstream,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const body = await response.text();

    if (response.ok)
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });

    console.warn(`Groq respondeu ${response.status}: ${body}`);
    return json({ error: messageFor(response.status), upstream: safeUpstream(body) }, response.status);
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError'))
      return json({ error: 'A transcrição demorou demais e foi cancelada.' }, 504);

    console.error('Erro de rede ao falar com a Groq', error);
    return json({ error: 'Não foi possível alcançar a Groq. Verifique a conexão.' }, 502);
  }
}

const asText = (value: FormDataEntryValue | null): string =>
  typeof value === 'string' ? value.trim() : '';

// A rota mora no próprio arquivo, e não numa convenção de pasta ou num redirect
// escondido no netlify.toml.
export const config: Config = { path: '/api/transcribe' };
