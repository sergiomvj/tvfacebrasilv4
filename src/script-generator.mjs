/**
 * Script Generator — TV FaceBrasil v4
 * Gera roteiro de Short 9:16 a partir de artigo usando LLM.
 * Suporta OpenRouter, OpenAI, legado LLM_API_KEY ou mock.
 */

import { createChatCompletion, getTextProviders, hasUsableTextProvider } from './llm-provider.mjs';
import { envBool } from './env.mjs';

const MOCK_TEMPLATE = [
  '[HOOK — 5s]',
  '🔥 {hook}',
  '',
  '[INTRO — 10s]',
  'Você sabia que {hook}? Eu sou o apresentador da FaceBrasil',
  'e hoje vou te contar sobre {title}.',
  '',
  '[CORPO — 30s]',
  '- {point1}',
  '- {point2}',
  '- {point3}',
  '',
  '[CTA — 10s]',
  'Quer saber mais? O artigo completo está em facebrasil.com. Até a próxima!',
  '',
  '[CHAPÉU — 5s]',
  'FaceBrasil — Sua comunidade brasileira nos Estados Unidos.'
].join('\n');

/**
 * Gera roteiro otimizado para Short (9:16, max 60s).
 * @param {{ title: string, content: string, category?: string }} article
 * @returns {Promise<string>} Roteiro formatado
 */
export async function generateScript(article) {
  const forceMock = envBool(false, 'TVFACEBRASIL_LLM_MOCK', 'LLM_MOCK');
  const isMock = forceMock || !hasUsableTextProvider();

  if (isMock) {
    console.log('[Script Mock] Artigo:', article.title);
    return buildMockScript(article);
  }

  const prompt = `Você é roteirista de Shorts de notícias para YouTube.
Formato: 9:16, duração máxima 60s, apresentador avatar digital.
Idioma: PT-BR, tom jornalístico mas coloquial.

REGRAS:
1. Hook forte nos primeiros 5 segundos
2. Máximo 150 palavras
3. Frases de no máximo 15 palavras
4. Linguagem simples e direta
5. Termine com call to action para facebrasil.com
6. Marca no final: "FaceBrasil — Sua comunidade brasileira nos Estados Unidos"

ARTIGO:
${article.title}
${(article.content || '').substring(0, 2000)}

Produza APENAS o script. Sem explicações.`;

  const providers = getTextProviders();
  let lastError = null;

  for (const provider of providers) {
    try {
      const script = await createChatCompletion(provider, prompt);
      if (script) {
        console.log('[Script] Roteiro gerado com LLM:', {
          provider: provider.name,
          model: provider.model,
          article: article.title
        });
        return script;
      }

      lastError = new Error(`Resposta vazia do provedor ${provider.name}`);
    } catch (error) {
      lastError = error;
      console.error('[Script] Falha no provedor LLM:', {
        provider: provider.name,
        model: provider.model,
        error: error.message
      });
    }
  }

  console.error('[Script] Todos os provedores LLM falharam. Usando mock:', lastError?.message);
  return buildMockScript(article);
}

function buildMockScript(article) {
  return MOCK_TEMPLATE
    .replace(/{hook}/g, extractHook(article.content) || article.title)
    .replace(/{title}/g, article.title)
    .replace(/{point1}/g, extractSnippet(article.content, 0) || 'o fato principal')
    .replace(/{point2}/g, extractSnippet(article.content, 1) || 'um detalhe importante')
    .replace(/{point3}/g, extractSnippet(article.content, 2) || 'os números mostram isso');
}

/** Extrai hook do conteúdo (primeiras 8 palavras, sem HTML) */
function extractHook(content) {
  if (!content) return null;
  const text = content.replace(/<[^>]+>/g, '').trim();
  return text.split(/\s+/).slice(0, 8).join(' ');
}

/** Extrai um snippet do conteúdo por índice de sentença */
function extractSnippet(content, index) {
  if (!content) return null;
  const text = content.replace(/<[^>]+>/g, '').trim();
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
  return sentences[index]?.trim()?.substring(0, 100) || null;
}

export { MOCK_TEMPLATE };
