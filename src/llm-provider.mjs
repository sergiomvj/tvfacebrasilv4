/**
 * LLM Provider Router — TV FaceBrasil v4
 *
 * Provider order:
 * 1. OpenRouter for text experiments and model routing.
 * 2. OpenAI as text fallback.
 * 3. Legacy LLM_API_KEY/LLM_MODEL compatibility.
 * 4. Deterministic mock handled by caller.
 */

import { envValue, hasUsableValue } from './env.mjs';

export function getTextProviders() {
  const providers = [];

  const openRouterApiKey = envValue('TVFACEBRASIL_OPENROUTER_API_KEY', 'OPENROUTER_API_KEY');
  if (hasUsableValue(openRouterApiKey)) {
    providers.push({
      name: 'openrouter',
      apiKey: openRouterApiKey,
      model: envValue('TVFACEBRASIL_OPENROUTER_MODEL_TEXT', 'OPENROUTER_MODEL_TEXT') || 'deepseek/deepseek-v4-flash',
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'HTTP-Referer': 'https://facebrasil.com',
        'X-Title': 'TV FaceBrasil v4'
      }
    });
  }

  const openAiApiKey = envValue('TVFACEBRASIL_OPENAI_API_KEY', 'OPENAI_API_KEY');
  if (hasUsableValue(openAiApiKey)) {
    providers.push({
      name: 'openai',
      apiKey: openAiApiKey,
      model: envValue('TVFACEBRASIL_OPENAI_MODEL_TEXT', 'OPENAI_MODEL_TEXT') || 'gpt-4.1-mini'
    });
  }

  const legacyApiKey = envValue('LLM_API_KEY');
  if (hasUsableValue(legacyApiKey)) {
    providers.push({
      name: 'legacy',
      apiKey: legacyApiKey,
      model: envValue('LLM_MODEL') || 'gpt-4.1-mini'
    });
  }

  return providers;
}

export async function createChatCompletion(provider, prompt) {
  const { default: OpenAI } = await import('openai');
  const client = new OpenAI({
    apiKey: provider.apiKey,
    baseURL: provider.baseURL,
    defaultHeaders: provider.headers
  });

  console.log('[LLM] Tentando provedor:', {
    provider: provider.name,
    model: provider.model
  });

  const response = await client.chat.completions.create({
    model: provider.model,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300,
    temperature: 0.7
  });

  return response.choices[0]?.message?.content?.trim() || '';
}

export function hasUsableTextProvider() {
  return getTextProviders().length > 0;
}
