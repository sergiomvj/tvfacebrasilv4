/**
 * OpenRouter Video Client — Chamada direta à API OpenRouter para geração de vídeo.
 *
 * Modo experimental, controlado por flag explícita. Não entra no fluxo diário.
 * Usa video-provider-catalog para normalizar request/response por modelo.
 */

import { envValue, hasUsableValue } from './env.mjs';
import { normalizeVideoRequest, parseVideoResponse, selectOpenRouterVideoModel } from './video-provider-catalog.mjs';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

/**
 * Gera um vídeo via OpenRouter usando o modelo especificado.
 *
 * @param {{ prompt: string, model?: string, duration?: number, ratio?: string }} params
 * @returns {Promise<{ success: boolean, videoUrl?: string, videoId?: string, status: string, model: string, duration: number, error?: string }>}
 */
export async function generateVideo({ prompt, model, duration = 10, ratio = '9:16' }) {
  const apiKey = envValue('TVFACEBRASIL_OPENROUTER_API_KEY', 'OPENROUTER_API_KEY');

  if (!hasUsableValue(apiKey)) {
    return { success: false, status: 'error', error: 'OpenRouter API key não configurada', model: model || 'unknown', duration: 0 };
  }

  const selectedModel = model || selectOpenRouterVideoModel()?.model;
  if (!selectedModel) {
    return { success: false, status: 'error', error: 'Nenhum modelo OpenRouter configurado', model: 'unknown', duration: 0 };
  }

  const body = normalizeVideoRequest({ prompt, model: selectedModel, duration, ratio });
  const startTime = Date.now();

  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fbr.news',
        'X-Title': 'TV FaceBrasil'
      },
      body: JSON.stringify({
        ...body,
        stream: false
      })
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const raw = await response.json();

    if (!response.ok) {
      const errorMsg = raw?.error?.message || `HTTP ${response.status}`;
      console.log(`[OpenRouterVideo] Erro: ${errorMsg}`);
      return { success: false, status: 'error', error: errorMsg, model: selectedModel, duration: parseFloat(elapsed) };
    }

    const parsed = parseVideoResponse(raw, selectedModel);
    return { ...parsed, model: selectedModel, duration: parseFloat(elapsed) };

  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    return { success: false, status: 'error', error: err.message, model: selectedModel, duration: parseFloat(elapsed) };
  }
}

export default { generateVideo };