#!/usr/bin/env node
/**
 * TV FaceBrasil v4 — Orquestrador Principal
 *
 * Workflow: fetch articles → generate scripts → produce shorts → update DB
 *
 * Uso:
 *   node src/index.js                      # Executa workflow uma vez
 *   node src/index.js --daily                  # Executa e mantém cron (30min)
 *   node src/index.js --once                   # Executa uma vez e sai
 *   node src/index.js --limit=3                # Processa 3 artigos
 *   node src/index.js --daysBack=14            # Artigos dos últimos 14 dias
 *   node src/index.js --dry-run                # Lista artigos sem executar
 */

import 'dotenv/config';
import { getNextAccount, generateShort, checkVideoStatus, resetRoundRobin, getConcurrencyLimit, runWithConcurrency } from './heygen-client.mjs';
import { generateScript } from './script-generator.mjs';
import { validateScript } from './script-validator.mjs';
import { fetchTopArticles, saveVideoMetadata } from './facebrasil-bridge.mjs';
import { envBool } from './env.mjs';
import { recordProduction, wasProcessedThisCycle, getTotalProcessed, resetCycle as resetState } from './state-tracker.mjs';
import cron from 'node-cron';

const args = process.argv.slice(2);

/** Parse CLI flags no formato --key=value ou --flag */
function parseArgs(argv) {
  const parsed = { flags: [] };
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq > 0) {
        parsed[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        parsed.flags.push(arg.slice(2));
      }
    }
  }
  return parsed;
}

const cli = parseArgs(args);
const isDaily = cli.flags.includes('daily');
const isOnce = cli.flags.includes('once');
const isDryRun = cli.flags.includes('dry-run') || cli.flags.includes('dryRun');
const cliLimit = cli.limit ? parseInt(cli.limit, 10) : 5;
const cliDaysBack = cli.daysBack ? parseInt(cli.daysBack, 10) : 7;

/**
 * Executa o ciclo completo de produção:
 * 1. Busca top artigos
 * 2. Para cada artigo: gera roteiro + chama HeyGen
 * 3. Verifica status
 * 4. Salva metadados
 */
async function runProductionCycle() {
  console.log('='.repeat(50));
  console.log('[TV FaceBrasil] 🎬 Iniciando ciclo de produção');
  console.log('[TV FaceBrasil] Modo:', envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK') ? 'MOCK (offline)' : 'PRODUÇÃO');
  console.log('='.repeat(50));

  const startTime = Date.now();

  try {
    const isMock = envBool(false, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK');

    // Passo 1: Buscar artigos
    console.log('\n[1/4] Buscando artigos...');
    const articles = await fetchTopArticles({ limit: cliLimit, daysBack: cliDaysBack, minViews: 50 });
    const newArticles = articles.filter(a => !wasProcessedThisCycle(a.id));
    if (newArticles.length < articles.length) {
      console.log(`[1/4] ${articles.length} encontrados, ${newArticles.length} novos (${articles.length - newArticles.length} ja processados neste ciclo)`);
    } else {
      console.log(`[1/4] ${articles.length} artigos encontrados`);
    }

    // Substitui pelo array filtrado
    articles.length = 0;
    articles.push(...newArticles);

    if (articles.length === 0) {
      console.log('[TV FaceBrasil] Nenhum artigo para processar. \u23ED\ufe0f');
      return { processed: 0, duration: 0, articles: [] };
    }

    if (isDryRun) {
      console.log('[TV FaceBrasil] \uD83C\uDFC1 Dry run — apenas listando artigos. Nenhuma acao executada.');
      articles.forEach((a, i) => console.log('  ' + (i + 1) + '. ' + a.id + ' — ' + a.title));
      return { processed: articles.length, duration: 0, articles, dryRun: true };
    }

    resetRoundRobin();
    resetState();
    const totalProcessed = getTotalProcessed();
    console.log('[StateTracker] Registros historicos:', totalProcessed);
    const results = [];

    // Passo 2: Gerar scripts + vídeos com concorrência controlada
    console.log('\n[2/4] Gerando roteiros e vídeos...');
    const concurrency = getConcurrencyLimit();
    console.log(`[2/4] Concorrência máxima: ${concurrency}`);

    const batchTasks = articles.map((article, i) => async () => {
      console.log(`\n--- Artigo ${i + 1}/${articles.length}: ${article.title} ---`);

      try {
        // Gera roteiro
        const script = await generateScript(article);
        const validation = validateScript(script);
        console.log(`[2/4] Roteiro gerado (${validation.wordCount} palavras)`);

        if (!validation.approved) {
          console.error('[2/4] Roteiro reprovado:', validation.reasons);
          return { article, script, validation, video: { success: false, error: validation.reasons.join('; ') } };
        }

        // Seleciona conta/avatar (round-robin com preferência de categoria)
        const { account, avatarId, voiceId } = getNextAccount(article.category);

        // Chama HeyGen
        const videoResult = await generateShort({
          title: article.title,
          script,
          account,
          avatarId,
          voiceId
        });

        console.log(`[2/4] Vídeo ${videoResult.success ? '✅ gerado' : '❌ falhou'}:`, {
          videoId: videoResult.videoId,
          duration: videoResult.duration,
          account: videoResult.account,
          mock: videoResult.mock
        });

        return { article, script, validation, video: videoResult };
      } catch (error) {
        console.error('[2/4] Falha no artigo. Continuando batch:', {
          article: article.title,
          error: error.message
        });
        return { article, video: { success: false, error: error.message } };
      }
    });

    const batchResults = await runWithConcurrency(batchTasks, concurrency);
    results.push(...batchResults);

    // Passo 3: Verificar status em paralelo (apenas para videos pendentes)
    console.log('\n[3/4] Verificando status dos videos...');
    const completedVideos = [];
    const checkTasks = results
      .filter(r => r.video.success)
      .map(r => () => checkVideoStatus(r.video.videoId, {
        maxPollTime: 30_000,
        interval: 1_000
      }).then(status => {
        console.log(`[3/4] ${r.article.title}: ${status.status}`);
        completedVideos.push({ ...r, status });
      }));

    await runWithConcurrency(checkTasks, concurrency);

    // Passo 4: Salvar metadados
    console.log('\n[4/4] Salvando metadados no banco...');
    for (const cv of completedVideos) {
      if (cv.status.status === 'completed') {
        const saveResult = await saveVideoMetadata(cv.article.id, {
          url: cv.status.url || cv.video.url,
          videoId: cv.video.videoId,
          duration: cv.video.duration || 45,
          account: cv.video.account,
          avatarId: cv.video.avatarId
        });
        if (saveResult.success) {
          recordProduction({
            articleId: cv.article.id,
            title: cv.article.title,
            url: cv.status.url || cv.video.url,
            script: cv.script?.scriptText || null,
            jobId: cv.video.videoId,
            videoId: cv.video.videoId,
            status: cv.status.status,
            account: cv.video.account,
            avatarId: cv.video.avatarId
          });
        }
        console.log(`[4/4] Artigo ${cv.article.id}: ${saveResult.success ? '✅' : '❌'}`);
      } else {
        console.log(`[3/4] ${cv.article.title}: ${cv.status.status === 'timeout' ? '⏰ timeout' : '❌ ' + cv.status.status} — ignorado`);
      }
    }

    const totalDuration = (Date.now() - startTime) / 1000;
    const successCount = completedVideos.filter(v => v.status.status === 'completed').length;

    console.log('\n' + '='.repeat(50));
    console.log(`[TV FaceBrasil] ✅ Ciclo concluído em ${totalDuration.toFixed(1)}s`);
    console.log(`[TV FaceBrasil] 📊 ${articles.length} artigos → ${successCount} vídeos gerados`);
    console.log('='.repeat(50));

    return { processed: articles.length, duration: totalDuration, articles: results };
  } catch (error) {
    console.error('\n[TV FaceBrasil] ❌ Erro no ciclo:', error.message);
    console.error(error.stack);
    return { processed: 0, duration: 0, error: error.message };
  }
}

// --- Main ---
console.log(`TV FaceBrasil v4 - Initializing`);
console.log(`Modo: ${isDaily ? 'CRON (30min)' : isOnce ? 'ÚNICO' : 'PADRÃO'}`);

if (isDaily) {
  // Executa imediatamente e depois a cada 30 minutos
  await runProductionCycle();
  console.log('\n[TV FaceBrasil] ⏰ Agendando execução a cada 30 minutos...');
  cron.schedule('*/30 * * * *', () => {
    runProductionCycle().catch(console.error);
  });
} else {
  // Executa uma vez
  await runProductionCycle();
  console.log('\n[TV FaceBrasil] Use --daily para manter execução contínua.');
  process.exit(0);
}
