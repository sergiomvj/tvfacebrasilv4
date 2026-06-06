/**
 * State Tracker — Persistência de estado de produção em JSONL.
 *
 * Registra cada artigo processado e evita duplicação no mesmo ciclo.
 * Para MVP single-instance. Upgrade para Supabase quando houver escala.
 *
 * Formato: uma linha JSON por artigo processado.
 * Campos: articleId, title, url, script, jobId, videoId, status, account, avatarId, timestamp
 */

import fs from 'node:fs';
import path from 'node:path';

const STATE_DIR = path.resolve(process.cwd(), '.aiox');
const STATE_FILE = path.join(STATE_DIR, 'production-state.jsonl');
const CYCLE_FILE = path.join(STATE_DIR, 'current-cycle.json');

/** IDs processados no ciclo atual (evita duplicação intra-ciclo) */
let currentCycleIds = new Set();

/** Garante que o diretório .aiox existe */
function ensureDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

/** Salva um registro de produção no JSONL */
export function recordProduction({ articleId, title, url, script, jobId, videoId, status, account, avatarId }) {
  ensureDir();

  const record = {
    articleId,
    title,
    url: url || null,
    script: script ? (script.length > 200 ? script.slice(0, 200) + '...' : script) : null,
    jobId: jobId || null,
    videoId: videoId || null,
    status: status || 'unknown',
    account: account || null,
    avatarId: avatarId || null,
    timestamp: new Date().toISOString()
  };

  try {
    fs.appendFileSync(STATE_FILE, JSON.stringify(record) + '\n', 'utf-8');
  } catch (err) {
    console.warn('[StateTracker] Erro ao salvar registro:', err.message);
  }

  // Marca como processado no ciclo atual
  currentCycleIds.add(articleId);
}

/** Verifica se um artigo já foi processado no ciclo atual */
export function wasProcessedThisCycle(articleId) {
  return currentCycleIds.has(articleId);
}

/** Retorna o número total de registros no JSONL */
export function getTotalProcessed() {
  try {
    if (!fs.existsSync(STATE_FILE)) return 0;
    const data = fs.readFileSync(STATE_FILE, 'utf-8').trim();
    return data ? data.split('\n').length : 0;
  } catch {
    return 0;
  }
}

/** Lê os últimos N registros (para relatório) */
export function getRecentRecords(n = 10) {
  try {
    if (!fs.existsSync(STATE_FILE)) return [];
    const lines = fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    return lines.slice(-n).map(line => {
      try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/** Reseta o estado do ciclo atual (chamado no início de cada ciclo) */
export function resetCycle() {
  currentCycleIds = new Set();
  try {
    if (fs.existsSync(CYCLE_FILE)) fs.unlinkSync(CYCLE_FILE);
  } catch { /* ignorar */ }
}

/** Salva o estado do ciclo atual (para resumir se o processo morrer) */
function saveCycleState() {
  try {
    ensureDir();
    fs.writeFileSync(CYCLE_FILE, JSON.stringify({ ids: [...currentCycleIds], updatedAt: new Date().toISOString() }), 'utf-8');
  } catch { /* ignorar */ }
}

export default {
  recordProduction,
  wasProcessedThisCycle,
  getTotalProcessed,
  getRecentRecords,
  resetCycle
};