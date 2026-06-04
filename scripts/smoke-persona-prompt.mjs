#!/usr/bin/env node

import { composePersonaVideoPrompt } from '../src/persona-prompt.mjs';

const result = await composePersonaVideoPrompt({
  articleTopic: 'Novas regras de imigração para brasileiros nos Estados Unidos',
  articleSummary: 'Mudanças de prazo e taxas podem afetar famílias brasileiras.',
  script: 'Brasileiros nos Estados Unidos precisam ficar atentos às novas regras.'
});

const required = [
  'PERSONA_ID: facebrasil-presenter-01',
  'PERSONA_VERSION:',
  'PERSONA_BASE:',
  'WARDROBE_LOCK:',
  'FACE_AND_BODY_CONSISTENCY:',
  'NEGATIVE_RULES:'
];

const missing = required.filter(token => !result.prompt.includes(token));

if (missing.length > 0) {
  console.error('[smoke:persona] Falhou. Campos ausentes:', missing);
  process.exit(1);
}

console.log('[smoke:persona] OK', {
  personaId: result.personaId,
  personaVersion: result.personaVersion,
  promptChars: result.prompt.length
});
