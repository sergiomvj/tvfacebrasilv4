#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function scalar(text, key) {
  const match = text.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^"|"$/g, '') : null;
}

function listUnder(text, key) {
  const lines = text.split('\n');
  const start = lines.findIndex(line => line.trim() === `${key}:`);
  if (start === -1) return [];

  const items = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^\S/.test(line) && !line.trim().startsWith('-')) break;
    const match = line.match(/^\s*-\s+(.+)$/);
    if (match) items.push(match[1].trim());
  }
  return items;
}

function workflowSteps(text) {
  const steps = [];
  let current = null;

  for (const line of text.split('\n')) {
    const id = line.match(/^\s*-\s+id:\s+(.+)$/);
    if (id) {
      current = { id: id[1].trim() };
      steps.push(current);
      continue;
    }

    if (!current) continue;

    const field = line.match(/^\s{4}(task|squad|output):\s+(.+)$/);
    if (field) {
      current[field[1]] = field[2].trim();
    }
  }

  return steps;
}

const tvSquad = read('squads/tv-facebrasil/squad.yaml');
const bridgeSquad = read('squads/facebrasil-bridge/squad.yaml');
const workflow = read('squads/tv-facebrasil/workflows/daily-production.yaml');

assert(scalar(tvSquad, 'name') === 'tv-facebrasil-squad', 'tv-facebrasil-squad nao declarado');
assert(listUnder(tvSquad, 'agents').includes('@scriptwriter'), 'scriptwriter ausente no tv-facebrasil-squad');
assert(listUnder(tvSquad, 'agents').includes('@video-producer'), 'video-producer ausente no tv-facebrasil-squad');
assert(listUnder(tvSquad, 'tasks').includes('generate-script'), 'generate-script ausente no tv-facebrasil-squad');
assert(listUnder(tvSquad, 'tasks').includes('produce-video'), 'produce-video ausente no tv-facebrasil-squad');
assert(scalar(tvSquad, 'mode') === 'mock-safe', 'tv-facebrasil-squad deve ser mock-safe');

assert(scalar(bridgeSquad, 'name') === 'facebrasil-bridge-squad', 'facebrasil-bridge-squad nao declarado');
assert(listUnder(bridgeSquad, 'agents').includes('@article-fetcher'), 'article-fetcher ausente no facebrasil-bridge-squad');
assert(scalar(bridgeSquad, 'mode') === 'mock-safe', 'facebrasil-bridge-squad deve ser mock-safe');

for (const file of [
  'squads/tv-facebrasil/tasks/generate-script.yaml',
  'squads/tv-facebrasil/tasks/produce-video.yaml',
  'squads/tv-facebrasil/tasks/check-status.yaml',
  'squads/facebrasil-bridge/tasks/fetch-top-articles.yaml',
  'squads/facebrasil-bridge/tasks/update-video-status.yaml'
]) {
  assert(fs.existsSync(path.join(root, file)), `task ausente: ${file}`);
}

const steps = workflowSteps(workflow);
const expected = [
  ['fetch', 'fetch-top-articles', 'facebrasil-bridge-squad'],
  ['script', 'generate-script', 'tv-facebrasil-squad'],
  ['video', 'produce-video', 'tv-facebrasil-squad'],
  ['status', 'check-status', 'tv-facebrasil-squad'],
  ['persist-status', 'update-video-status', 'facebrasil-bridge-squad']
];

assert(scalar(workflow, 'name') === 'daily-production', 'workflow daily-production nao declarado');
assert(scalar(workflow, 'mode') === 'mock-safe', 'workflow daily-production deve ser mock-safe');
assert(steps.length === expected.length, `workflow deveria ter ${expected.length} steps, encontrou ${steps.length}`);

expected.forEach(([id, task, squad], index) => {
  const step = steps[index];
  assert(step.id === id, `step ${index + 1} deveria ser ${id}, encontrou ${step.id}`);
  assert(step.task === task, `step ${id} deveria usar task ${task}, encontrou ${step.task}`);
  assert(step.squad === squad, `step ${id} deveria usar squad ${squad}, encontrou ${step.squad}`);
});

const dryRunState = {
  articles: [{ id: 'mock-001', title: 'Artigo mock' }],
  scripts: [{ articleId: 'mock-001', text: 'Roteiro mock' }],
  videos: [{ articleId: 'mock-001', videoId: 'mock-video-001' }],
  completed: [{ articleId: 'mock-001', status: 'completed' }]
};

console.log('[AIOX Smoke] Estrutura declarativa validada');
console.log('[AIOX Smoke] Dry-run mock:', {
  workflow: 'daily-production',
  route: expected.map(([id]) => id).join(' -> '),
  articles: dryRunState.articles.length,
  completed: dryRunState.completed.length
});
