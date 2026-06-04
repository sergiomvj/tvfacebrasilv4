#!/usr/bin/env node

import { getOpenRouterVideoModels, getVideoProviderConfig } from '../src/video-provider-catalog.mjs';

process.env.TVFACEBRASIL_OPENROUTER_VIDEO_MODEL ||= 'bytedance/seedance-2.0';
process.env.TVFACEBRASIL_OPENROUTER_VIDEO_MODEL2 ||= 'x-ai/grok-imagine-video';
process.env.TVFACEBRASIL_OPENROUTER_VIDEO_MODEL3 ||= 'kwaivgi/kling-v3.0-std';
process.env.TVFACEBRASIL_OPENROUTER_VIDEO_MODEL4 ||= 'google/veo-3.1-fast';
process.env.TVFACEBRASIL_OPENROUTER_VIDEO_ENABLED ||= 'false';

const models = getOpenRouterVideoModels();
const heygen = getVideoProviderConfig({ provider: 'heygen' });
const openrouter = getVideoProviderConfig({ provider: 'openrouter' });

if (models.length < 4) {
  console.error('[smoke:providers] Falhou. Modelos detectados:', models);
  process.exit(1);
}

if (heygen.provider !== 'heygen' || openrouter.provider !== 'openrouter') {
  console.error('[smoke:providers] Falhou. Providers inválidos:', { heygen, openrouter });
  process.exit(1);
}

console.log('[smoke:providers] OK', {
  models: models.map(item => item.model),
  openrouterEnabled: openrouter.enabled
});
