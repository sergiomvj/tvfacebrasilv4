/**
 * Experimental video provider catalog.
 *
 * This module only reads configuration. It does not call paid APIs.
 */

import { envBool, envValue, hasUsableValue } from './env.mjs';

const OPENROUTER_VIDEO_ENV_KEYS = [
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL', 'OPENROUTER_MODEL'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL2', 'OPENROUTER_MODEL2'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL3', 'OPENROUTER_MODEL3'],
  ['TVFACEBRASIL_OPENROUTER_VIDEO_MODEL4', 'OPENROUTER_MODEL4']
];

export function getOpenRouterVideoModels() {
  return OPENROUTER_VIDEO_ENV_KEYS
    .map((envKeys, index) => ({
      envKey: envKeys[0],
      legacyEnvKey: envKeys[1],
      model: envValue(...envKeys),
      primary: index === 0
    }))
    .filter(item => hasUsableValue(item.model));
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
    return {
      provider: 'openrouter',
      enabled: envBool(false, 'TVFACEBRASIL_OPENROUTER_VIDEO_ENABLED', 'OPENROUTER_VIDEO_ENABLED'),
      model: selected?.model || null,
      envKey: selected?.envKey || null
    };
  }

  throw new Error(`Provider de vídeo desconhecido: ${provider}`);
}
