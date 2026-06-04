/**
 * Persona Prompt Composer — TV FaceBrasil v4
 *
 * Builds stable AI-video prompts from a fixed Persona Bible plus the
 * article-specific task. No API calls happen here.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_TEMPLATE_PATH = resolve(
  __dirname,
  '../squads/tv-facebrasil/templates/persona-bible-template.md'
);

const SECTION_MAP = {
  personaBase: 'Persona Base',
  wardrobeLock: 'Wardrobe Lock',
  faceAndBodyConsistency: 'Face And Body Consistency',
  presentationStyle: 'Presentation Style',
  sceneBase: 'Scene Base',
  negativeConsistencyRules: 'Negative Consistency Rules',
  promptComposerTemplate: 'Prompt Composer Template'
};

export async function loadPersonaBible(templatePath = DEFAULT_TEMPLATE_PATH) {
  const markdown = await readFile(templatePath, 'utf8');
  const metadata = extractMetadata(markdown);

  return {
    id: metadata['Persona ID'] || 'facebrasil-presenter-01',
    version: metadata.Version || '0.1',
    status: metadata.Status || 'draft',
    templatePath,
    ...Object.fromEntries(
      Object.entries(SECTION_MAP).map(([key, heading]) => [key, extractCodeSection(markdown, heading)])
    )
  };
}

export async function composePersonaVideoPrompt({
  articleTopic,
  articleSummary = '',
  script = '',
  templatePath
}) {
  if (!articleTopic) {
    throw new Error('articleTopic é obrigatório para compor prompt de persona.');
  }

  const persona = await loadPersonaBible(templatePath);
  const videoTask = [
    'The presenter explains the following FaceBrasil article topic in Brazilian Portuguese with a calm journalistic delivery:',
    `"${articleTopic}"`,
    articleSummary ? `Article summary: ${articleSummary}` : '',
    script ? `Script to follow in Portuguese: ${script}` : '',
    'The video is a vertical 9:16 news short. The presenter should speak naturally, use subtle hand gestures, maintain eye contact with the camera, and keep the same identity described above throughout the entire clip.'
  ].filter(Boolean).join('\n\n');

  const prompt = [
    `PERSONA_ID: ${persona.id}`,
    `PERSONA_VERSION: ${persona.version}`,
    '',
    'PERSONA_BASE:',
    persona.personaBase,
    '',
    'WARDROBE_LOCK:',
    persona.wardrobeLock,
    '',
    'FACE_AND_BODY_CONSISTENCY:',
    persona.faceAndBodyConsistency,
    '',
    'PRESENTATION_STYLE:',
    persona.presentationStyle,
    '',
    'SCENE_BASE:',
    persona.sceneBase,
    '',
    'VIDEO_TASK:',
    videoTask,
    '',
    'NEGATIVE_RULES:',
    persona.negativeConsistencyRules
  ].join('\n');

  return {
    personaId: persona.id,
    personaVersion: persona.version,
    prompt
  };
}

function extractMetadata(markdown) {
  const metadataBlock = markdown.split('## Persona Base')[0] || '';
  const entries = [...metadataBlock.matchAll(/^- ([^:]+): `?([^`\n]+)`?/gm)];
  return Object.fromEntries(entries.map(([, key, value]) => [key.trim(), value.trim()]));
}

function extractCodeSection(markdown, heading) {
  const pattern = new RegExp(
    '## ' + escapeRegExp(heading) + '\\n\\n```text\\n([\\s\\S]*?)\\n```',
    'm'
  );
  const match = markdown.match(pattern);
  return match?.[1]?.trim() || '';
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
