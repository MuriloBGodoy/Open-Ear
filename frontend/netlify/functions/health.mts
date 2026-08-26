/**
 * health.mts — diz se dá para transcrever, sem revelar a chave.
 *
 * `groqConfigured` é booleano de propósito: o front precisa saber que a chave
 * existe, nunca qual é.
 */

import type { Config } from '@netlify/functions';
import { MODEL, json } from '../lib/groq.mts';

export default function handler(): Response {
  return json(
    {
      ok: true,
      model: MODEL,
      groqConfigured: Boolean(process.env.GROQ_API_KEY),
    },
    200,
  );
}

export const config: Config = { path: '/api/health' };
