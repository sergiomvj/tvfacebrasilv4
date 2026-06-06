/**
 * HeyGen Client — TV FaceBrasil v4
 * Gerencia 1+ contas Creator com round-robin seguro.
 * Modo mock: TVFACEBRASIL_HEYGEN_MOCK=true retorna respostas simuladas.
 * Migração Free → Creator: só trocar a chave no .env.
 */

import { envBool, envValue, hasUsableValue } from './env.mjs';
import fs from 'node:fs';
import path from 'node:path';

const STATE_FILE = path.resolve(process.cwd(), '.aiox/roundrobin-state.json');

let roundRobinIndex = 0;

/** Retorna o limite de concorrência configurado */
export function getConcurrencyLimit() {
  return Math.max(1, parseInt(envValue('TVFACEBRASIL_HEYGEN_CONCURRENCY') || '2', 10));
}

/** Executa um lote de funções assíncronas com limite de concorrência */
export async function runWithConcurrency(tasks, concurrency = 2) {
  const results = [];
  const executing = new Set();

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task()).then(result => {
      results[index] = result;
    });
    executing.add(promise);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
      executing.delete([...executing][0]);
    }
  }

  await Promise.allSettled(executing);
  return results;
}

/** Carrega estado persistido do round-robin */
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      roundRobinIndex = data.index || 0;
      console.log('[HeyGen] Estado round-robin carregado:', { index: roundRobinIndex });
    }
  } catch (err) {
    console.warn('[HeyGen] Não foi possível carregar estado round-robin:', err.message);
  }
}

/** Persiste estado do round-robin */
function saveState() {
  try {
    const dir = path.dirname(STATE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify({ index: roundRobinIndex }, null, 2));
  } catch (err) {
    console.warn('[HeyGen] Não foi possível salvar estado round-robin:', err.message);
  }
}

loadState();

function buildAccountPool() {
  const isMock = envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK');

  // Constrói contas dinamicamente baseado nas env vars disponíveis
  const accounts = [];

  // Conta-A é sempre default
  const keyA = envValue('TVFACEBRASIL_HEYGEN_A_API_KEY', 'HEYGEN_A_API_KEY');
  if (hasUsableValue(keyA) || isMock) {
    accounts.push({
      name: 'Conta-A',
      apiKey: keyA,
      avatarId: envValue('TVFACEBRASIL_HEYGEN_A_AVATAR_ID', 'HEYGEN_A_AVATAR_ID') || 'avatar-1',
      voiceId: envValue('TVFACEBRASIL_HEYGEN_A_VOICE_ID', 'HEYGEN_A_VOICE_ID') || 'voz-masc-ptbr'
    });
  }

  // Conta-B só entra se tiver API key
  const keyB = envValue('TVFACEBRASIL_HEYGEN_B_API_KEY', 'HEYGEN_B_API_KEY');
  if (hasUsableValue(keyB)) {
    accounts.push({
      name: 'Conta-B',
      apiKey: keyB,
      avatarId: envValue('TVFACEBRASIL_HEYGEN_B_AVATAR_ID', 'HEYGEN_B_AVATAR_ID') || 'avatar-2',
      voiceId: envValue('TVFACEBRASIL_HEYGEN_B_VOICE_ID', 'HEYGEN_B_VOICE_ID') || 'voz-fem-ptbr'
    });
  }

  const mode = accounts.length > 1 ? 'multi-account' : 'single-account';
  console.log('[HeyGen] Pool de contas:', { count: accounts.length, mode });

  return accounts;
}

export function getHeyGenAccounts() {
  return buildAccountPool().map(({ name, avatarId, voiceId }) => ({ name, avatarId, voiceId }));
}

/**
 * Retorna a próxima conta no round-robin.
 * @param {string|null} category - Categoria do artigo (opcional, para preferência)
 * @returns {{ account: string, avatarId: string, voiceId: string }}
 */
export function getNextAccount(category = null) {
  const accounts = buildAccountPool();

  if (accounts.length === 0) {
    throw new Error('Nenhuma conta HeyGen configurada. Configure TVFACEBRASIL_HEYGEN_A_API_KEY ou use TVFACEBRASIL_HEYGEN_MOCK=true.');
  }

  const idx = roundRobinIndex % accounts.length;
  roundRobinIndex++;

  const account = accounts[idx];

  // Preferência: notícia "dura" → Avatar-1, lifestyle → Avatar-2
  const hardNews = ['imigracao', 'direitos', 'economia', 'politica', 'leis'];
  const softNews = ['cultura', 'eventos', 'entretenimento', 'lifestyle', 'turismo'];

  let selected = account;
  if (category && hardNews.includes(category)) {
    selected = accounts.find(a => a.name === 'Conta-A') || accounts[0];
  } else if (category && softNews.includes(category) && accounts.length > 1) {
    selected = accounts.find(a => a.name === 'Conta-B') || accounts[1];
  }

  console.log('[HeyGen] Conta selecionada:', {
    account: selected.name,
    avatar: selected.avatarId,
    roundRobin: idx,
    category,
    mode: accounts.length === 1 ? 'single-account' : 'multi-account'
  });

  saveState();

  return { account: selected.name, ...selected };
}

/**
 * Chama HeyGen API v3 para gerar um Short 9:16.
 * @param {{ title: string, script: string, account: string, avatarId: string, voiceId: string }} params
 * @returns {Promise<{ success: boolean, videoId?: string, status?: string, url?: string, duration?: number, account?: string, avatarId?: string, mock?: boolean, error?: string }>}
 */
export async function generateShort({ title, script, account, avatarId, voiceId }) {
  const isMock = envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK');

  if (isMock) {
    console.log('[HeyGen Mock] Gerando vídeo:', { title, account, avatarId });

    // Simula tempo de processamento (1-3s)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));

    const wordCount = script.split(/\s+/).length;
    const duration = Math.min(Math.round(wordCount / 2.5), 60);

    return {
      success: true,
      videoId: 'mock-' + Date.now(),
      status: 'completed',
      url: `https://cdn.heygen.com/mock/${Date.now()}.mp4`,
      duration,
      account,
      avatarId,
      mock: true
    };
  }

  // Produção — chamada HeyGen v3
  const selected = buildAccountPool().find(a => a.name === account);
  const apiKey = selected ? selected.apiKey : null;

  if (!hasUsableValue(apiKey)) {
    throw new Error(`HeyGen API key não configurada para ${account}. Use TVFACEBRASIL_HEYGEN_MOCK=true para testes.`);
  }

  console.log('[HeyGen] Enviando para API v3:', { title, account, avatarId });
  // TODO: Implementar chamada HeyGen v3 quando as keys estiverem disponíveis
  // Docs: https://docs.heygen.com/reference/create-video

  const response = await fetch('https://api.heygen.com/v3/video/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': apiKey
    },
    body: JSON.stringify({
      video_name: `FaceBrasil - ${title}`,
      dimensions: { width: 1080, height: 1920 },
      aspect_ratio: '9:16',
      avatar: { avatar_id: avatarId, scale: 1.0, position: 'center-right' },
      voice: { voice_id: voiceId, speed: 1.0, emotion: 'neutral' },
      background: { type: 'color', value: '#003366' },
      caption: true,
      max_duration: 60,
      script_text: script
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`HeyGen API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  return {
    success: true,
    videoId: data.video_id,
    status: data.status || 'pending',
    account,
    avatarId
  };
}

/**
 * Polling de status do vídeo com backoff exponencial.
 * @param {string} videoId
 * @param {{ maxPollTime?: number, interval?: number }} [options]
 * @returns {Promise<{ status: string, videoId: string, url?: string }>}
 */
export async function checkVideoStatus(videoId, options = {}) {
  const maxPollTime = options.maxPollTime || 120_000;
  const baseInterval = options.interval || 5_000;

  if (envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK')) {
    return mockPolling(videoId, maxPollTime, baseInterval);
  }

  const startTime = Date.now();
  let attempt = 0;

  // Busca conta primária para consulta
  const account = buildAccountPool()[0];
  const apiKey = account ? account.apiKey : null;

  if (!hasUsableValue(apiKey)) {
    return { status: 'error', videoId };
  }

  while (Date.now() - startTime < maxPollTime) {
    attempt++;

    try {
      const response = await fetch(`https://api.heygen.com/v3/video/status?video_id=${videoId}`, {
        headers: { 'X-Api-Key': apiKey }
      });

      if (!response.ok) {
        const elapsed = Date.now() - startTime;
        const waitMs = Math.min(baseInterval * Math.pow(1.5, attempt - 1), 30_000);
        console.log('[HeyGen] Polling: erro HTTP', response.status, `- tentativa ${attempt}, aguardando ${waitMs}ms`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }

      const data = await response.json();

      if (data.status === 'completed' || data.status === 'failed' || data.status === 'error') {
        console.log('[HeyGen] Polling concluído:', {
          status: data.status,
          videoId,
          elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
          attempts: attempt
        });
        return {
          status: data.status,
          videoId,
          url: data.video_url
        };
      }

      // Ainda em processing/pending — espera com backoff
      const waitMs = Math.min(baseInterval * Math.pow(1.5, attempt - 1), 30_000);
      console.log('[HeyGen] Polling:', { status: data.status, videoId, attempt, waitMs: `${(waitMs / 1000).toFixed(1)}s` });
      await new Promise(r => setTimeout(r, waitMs));

    } catch (err) {
      const elapsed = Date.now() - startTime;
      const waitMs = Math.min(baseInterval * Math.pow(1.5, attempt - 1), 30_000);
      console.warn('[HeyGen] Polling: erro', err.message, `- tentativa ${attempt}, aguardando ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  // Timeout excedido
  console.log('[HeyGen] Polling: timeout após', `${((Date.now() - startTime) / 1000).toFixed(1)}s`, '- videoId:', videoId);
  return { status: 'timeout', videoId };
}

/**
 * Simula polling em modo mock — pending (2x), depois completed ou failed.
 */
async function mockPolling(videoId, maxPollTime, baseInterval) {
  const startTime = Date.now();
  let attempt = 0;

  while (Date.now() - startTime < maxPollTime) {
    attempt++;

    // Simula: 2 primeiras tentativas = pending
    if (attempt <= 2) {
      const waitMs = baseInterval;
      console.log('[HeyGen Mock] Polling:', { status: 'pending', videoId, attempt, waitMs: `${(waitMs / 1000).toFixed(1)}s` });
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }

    // 3ª tentativa: completed (90%) ou failed (10%)
    const isFailed = Math.random() < 0.1;
    const status = isFailed ? 'failed' : 'completed';

    console.log('[HeyGen Mock] Polling concluído:', {
      status,
      videoId,
      elapsed: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      attempts: attempt
    });

    return {
      status,
      videoId,
      url: isFailed ? undefined : `https://cdn.heygen.com/mock/${videoId}.mp4`
    };
  }

  return { status: 'timeout', videoId };
}

/** Reseta o round-robin para o início. */
export function resetRoundRobin() {
  roundRobinIndex = 0;
  saveState();
}
