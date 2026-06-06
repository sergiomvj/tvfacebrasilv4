/**
 * Prompt Composer — Combina Persona Bible + tarefa + artigo em prompt de vídeo.
 *
 * Cada execução registra qual Persona ID e versão foram usados,
 * permitindo rastrear consistência entre modelos de vídeo.
 *
 * Para modelos de vídeo OpenRouter: usa o bloco visual em inglês.
 * Para HeyGen: extrai apenas os parâmetros relevantes (aparência, cenário).
 */

import fs from 'node:fs';
import path from 'node:path';

const PERSONA_BIBLE_PATH = path.resolve(
  process.cwd(),
  'squads/tv-facebrasil/templates/persona-bible-template.md'
);

/** Persona ativa — versão fixa para o MVP */
const ACTIVE_PERSONA_ID = 'tvfacebrasil-presenter-v1';
const ACTIVE_PERSONA_VERSION = '1.0';

/**
 * Carrega a Persona Bible do template.
 * @returns {{ id: string, version: string, content: string }}
 */
export function loadPersonaBible() {
  let content = '';
  try {
    if (fs.existsSync(PERSONA_BIBLE_PATH)) {
      content = fs.readFileSync(PERSONA_BIBLE_PATH, 'utf-8');
    } else {
      console.warn('[PromptComposer] Persona Bible não encontrada em', PERSONA_BIBLE_PATH);
    }
  } catch (err) {
    console.warn('[PromptComposer] Erro ao carregar Persona Bible:', err.message);
  }

  return {
    id: ACTIVE_PERSONA_ID,
    version: ACTIVE_PERSONA_VERSION,
    content
  };
}

/**
 * Extrai o bloco visual em inglês do template (para modelos OpenRouter/vídeo).
 * @returns {string}
 */
export function extractVisualBlock() {
  const bible = loadPersonaBible();
  const match = bible.content.match(/```\s*\n\[Visual Description\][\s\S]*?```/);
  return match ? match[0] : '';
}

/**
 * Extrai parâmetros de apresentação (para HeyGen — aparência, cenário).
 * @returns {{ appearance: string, setting: string, style: string }}
 */
export function extractHeyGenParams() {
  const bible = loadPersonaBible();

  const appearance = bible.content.match(/## Aparência Física\n([\s\S]*?)\n##/)?.[1]?.trim() || '';
  const setting = bible.content.match(/## Cenário\n([\s\S]*?)\n##/)?.[1]?.trim() || '';
  const style = bible.content.match(/## Estilo de Apresentação\n([\s\S]*?)\n##/)?.[1]?.trim() || '';

  return { appearance, setting, style };
}

/**
 * Compõe o prompt final de vídeo combinando Persona Bible + tarefa + artigo.
 *
 * @param {{ task: string, title: string, topic: string, scriptText: string, articleUrl: string, provider: string }} params
 * @returns {{ prompt: string, personaId: string, personaVersion: string }}
 */
export function composeVideoPrompt({ task, title, topic, scriptText, articleUrl, provider = 'heygen' }) {
  const bible = loadPersonaBible();

  let visualBlock;
  if (provider === 'openrouter' || provider === 'video') {
    visualBlock = extractVisualBlock();
  } else {
    const heygen = extractHeyGenParams();
    visualBlock = `Aparência: ${heygen.appearance}\nCenário: ${heygen.setting}\nEstilo: ${heygen.style}`;
  }

  const scriptExcerpt = scriptText
    ? scriptText.split(/\s+/).slice(0, 100).join(' ') + (scriptText.split(/\s+/).length > 100 ? '...' : '')
    : '';

  const prompt = [
    `[Persona] ${bible.id} v${bible.version}`,
    '',
    `[Tarefa] ${task}`,
    '',
    `[Artigo] ${title}`,
    topic ? `[Tema] ${topic}` : '',
    articleUrl ? `[URL] ${articleUrl}` : '',
    '',
    scriptText ? `[Roteiro]\n${scriptExcerpt}` : '',
    '',
    '[Instrução Visual]',
    visualBlock,
    '',
    'Gere um vídeo curto (formato Short/Reels 9:16, máximo 60s) seguindo a persona acima.',
    'Use o roteiro como narração/legenda.',
    `Persona ID: ${bible.id} | Versão: ${bible.version}`
  ].filter(Boolean).join('\n');

  return {
    prompt,
    personaId: bible.id,
    personaVersion: bible.version
  };
}

export default {
  loadPersonaBible,
  composeVideoPrompt,
  extractVisualBlock,
  extractHeyGenParams
};