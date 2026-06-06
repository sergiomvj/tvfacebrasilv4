/**
 * Experimental video provider catalog.
 *
 * This module only reads configuration. It does not call paid APIs.
 */

import { envBool, envValue, hasUsableValue } from './env.mjs';

/** Modelos padrão quando nenhuma env var é configurada (modo dev/test) */
const DEFAULT_VIDEO_MODELS = [
  'bytedance/seedance-2.0',
  'x-ai/grok-imagine-video',
  'kwaivgi/kling-v3.0-std',
  'google/veo-3.1-fast'
];

const OPENROUTER_VIDEO_ENV_KEYS = [
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL', 'OPENROUTER_MODEL'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL2', 'OPENROUTER_MODEL2'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL3', 'OPENROUTER_MODEL3'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL4', 'OPENROUTER_MODEL4']
];

export function getOpenRouterVideoModels() {
  const models = OPENROUTER_VIDEO_ENV_KEYS
    .map((envKeys, index) => ({
      envKey: envKeys[0],
      legacyEnvKey: envKeys[1],
      model: envValue(...envKeys) || DEFAULT_VIDEO_MODELS[index],
      primary: index === 0
    }));

  console.log('[VideoCatalog] Modelos OpenRouter:', {
    count: models.length,
    primary: models[0].model,
    models: models.map(m => m.model)
  });

  return models;
}

export function selectOpenRouterVideoModel(requestedModel) {
  const models = getOpenRouterVideoModels();
  if (models.length === 0) {
    return null;
  }

  if (!requestedModel) {
    return models[0];
  }

  return models.find(item => (
    item.model === requestedModel ||
    item.envKey === requestedModel ||
    item.legacyEnvKey === requestedModel
  )) || null;
}

export function getVideoProviderConfig({ provider = envValue('TVFACEBRASIL_VIDEO_PROVIDER', 'VIDEO_PROVIDER') || 'heygen', model } = {}) {
  if (provider === 'heygen') {
    return {
      provider: 'heygen',
      mode: envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK') ? 'mock' : 'production'
    };
  }

  if (provider === 'openrouter') {
    const selected = selectOpenRouterVideoModel(model);
    const config = {
      provider: 'openrouter',
      enabled: envBool(false, 'TVFACEBRASIL_OPENROUTER_VIDEO_ENABLED', 'OPENROUTER_VIDEO_ENABLED'),
      model: selected?.model || null,
      envKey: selected?.envKey || null
    };

    console.log('[VideoCatalog] Config:', {
      provider: config.provider,
      enabled: config.enabled,
      model: config.model,
      mode: config.enabled ? 'production' : 'mock'
    });

    return config;
  }

  throw new Error(`Provider de vídeo desconhecido: ${provider}`);
}

/**
 * Adapter de request — normaliza payload por modelo.
 * Cada modelo OpenRouter pode ter schema de entrada diferente.
 *
 * @param {{ prompt: string, model: string, duration?: number, ratio?: string }} params
 * @returns {object} Payload normalizado para OpenRouter
 */
export function normalizeVideoRequest({ prompt, model, duration = 10, ratio = '9:16' }) {
  const base = {
    model,
    prompt,
    n: 1
  };

  // bytedance/seedance-2.0 usa formato específico
  if (model.startsWith('bytedance/')) {
    return { ...base, duration, resolution: ratio === '9:16' ? '1080x1920' : '1920x1080' };
  }

  // x-ai/grok-imagine-video
  if (model.startsWith('x-ai/')) {
    return { ...base, aspect_ratio: ratio, style: 'realistic' };
  }

  // kwaivgi/kling (Kling)
  if (model.includes('kling')) {
    return { ...base, duration, aspect_ratio: ratio, mode: 'standard' };
  }

  // google/veo (Veo)
  if (model.includes('veo')) {
    return { ...base, aspect_ratio: ratio, person_generation: 'allow' };
  }

  // Fallback genérico
  return { ...base, aspect_ratio: ratio };
}

/**
 * Adapter de response — normaliza resposta de qualquer modelo.
 *
 * @param {object} raw - Resposta crua do OpenRouter
 * @param {string} model - Modelo que gerou a resposta
 * @returns {{ success: boolean, videoUrl?: string, videoId?: string, status: string, error?: string }}
 */
export function parseVideoResponse(raw, model) {
  // OpenRouter retorna { id, model, choices: [{ video: { url } }] }
  if (raw?.choices?.[0]?.video?.url) {
    return { success: true, videoUrl: raw.choices[0].video.url, videoId: raw.id, status: 'completed' };
  }

  // Ou { data: [{ url }] }
  if (raw?.data?.[0]?.url) {
    return { success: true, videoUrl: raw.data[0].url, videoId: raw.id, status: 'completed' };
  }

  // Status polling
  if (raw?.status) {
    return { success: raw.status === 'completed', videoUrl: raw.video_url || raw.url, videoId: raw.id, status: raw.status };
  }

  return { success: false, status: 'error', error: `Formato de resposta não reconhecido para ${model}` };
}
