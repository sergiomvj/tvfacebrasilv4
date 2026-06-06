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
  const accountDefs = [
    {
      name: 'Conta-A',
      apiKey: envValue('TVFACEBRASIL_HEYGEN_A_API_KEY', 'HEYGEN_A_API_KEY'),
      avatarId: envValue('TVFACEBRASIL_HEYGEN_A_AVATAR_ID', 'HEYGEN_A_AVATAR_ID') || 'avatar-1',
      voiceId: envValue('TVFACEBRASIL_HEYGEN_A_VOICE_ID', 'HEYGEN_A_VOICE_ID') || 'voz-masc-ptbr'
    },
    {
      name: 'Conta-B',
      apiKey: envValue('TVFACEBRASIL_HEYGEN_B_API_KEY', 'HEYGEN_B_API_KEY'),
      avatarId: envValue('TVFACEBRASIL_HEYGEN_B_AVATAR_ID', 'HEYGEN_B_AVATAR_ID') || 'avatar-2',
      voiceId: envValue('TVFACEBRASIL_HEYGEN_B_VOICE_ID', 'HEYGEN_B_VOICE_ID') || 'voz-fem-ptbr'
    }
  ];

  const configured = accountDefs.filter(account => hasUsableValue(account.apiKey));

  if (configured.length > 0) {
    return configured;
  }

  if (isMock) {
    return [accountDefs[0]];
  }

  return [];
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
 * Verifica o status de um vídeo em andamento.
 * @param {string} videoId
 * @returns {Promise<{ status: string, videoId: string, url?: string }>}
 */
export async function checkVideoStatus(videoId) {
  if (envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK')) {
    return { status: 'completed', videoId, url: `https://cdn.heygen.com/mock/${videoId}.mp4` };
  }

  const account = buildAccountPool()[0];
  const apiKey = account ? account.apiKey : null;

  if (!hasUsableValue(apiKey)) {
    return { status: 'error', videoId };
  }

  // Usa a primeira conta configurada para polling.
  const response = await fetch(`https://api.heygen.com/v3/video/status?video_id=${videoId}`, {
    headers: { 'X-Api-Key': apiKey }
  });

  if (!response.ok) {
    return { status: 'error', videoId };
  }

  const data = await response.json();
  return {
    status: data.status,
    videoId,
    url: data.video_url
  };
}

/** Reseta o round-robin para o início. */
export function resetRoundRobin() {
  roundRobinIndex = 0;
  saveState();
}
