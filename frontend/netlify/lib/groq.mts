/**
 * groq.mts — o que `/api/transcribe` e `/api/health` compartilham.
 *
 * Fica fora de `netlify/functions/` de propósito: todo arquivo naquela pasta
 * vira uma rota, e este aqui não é um endpoint.
 */

export const MODEL = 'whisper-large-v3-turbo';

export const json = (payload: unknown, status: number): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Mensagem de erro que o usuário lê. Nunca o status cru. */
export function messageFor(status: number): string {
  switch (status) {
    case 401:
      return 'Chave da Groq inválida ou expirada.';
    case 429:
      return 'Limite de uso da Groq atingido. Aguarde um instante e tente de novo.';
    case 413:
      return 'Áudio grande demais para a Groq. Fatie em trechos menores.';
    case 400:
      return 'A Groq recusou o áudio (formato ou duração inválidos).';
    default:
      return `Falha na transcrição (HTTP ${status}).`;
  }
}

/**
 * Evita vazar detalhe interno da upstream no cliente, mas preserva o campo
 * `message` quando a Groq manda algo útil (ex.: formato não suportado).
 */
export function safeUpstream(body: string): string | undefined {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: unknown } };
    const message = parsed?.error?.message;
    return typeof message === 'string' ? message : undefined;
  } catch {
    return undefined; // corpo não-JSON: ignora
  }
}
