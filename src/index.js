#!/usr/bin/env node
/**
 * TV FaceBrasil v4 — Orquestrador Principal
 *
 * Workflow: fetch articles → generate scripts → produce shorts → update DB
 *
 * Uso:
 *   node src/index.js            # Executa workflow uma vez
 *   node src/index.js --daily    # Executa e mantém cron (30min)
 *   node src/index.js --once     # Executa uma vez e sai
 */

import 'dotenv/config';
import { getNextAccount, generateShort, checkVideoStatus, resetRoundRobin } from './heygen-client.mjs';
import { generateScript } from './script-generator.mjs';
import { validateScript } from './script-validator.mjs';
import { fetchTopArticles, saveVideoMetadata } from './facebrasil-bridge.mjs';
import { envBool } from './env.mjs';
import cron from 'node-cron';

const args = process.argv.slice(2);
const isDaily = args.includes('--daily');
const isOnce = args.includes('--once');

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
    // Passo 1: Buscar artigos
    console.log('\n[1/4] Buscando artigos...');
    const articles = await fetchTopArticles({ limit: 5, daysBack: 7, minViews: 50 });
    console.log(`[1/4] ${articles.length} artigos encontrados`);

    if (articles.length === 0) {
      console.log('[TV FaceBrasil] Nenhum artigo para processar. ⏭️');
      return { processed: 0, duration: 0, articles: [] };
    }

    resetRoundRobin();
    const results = [];

    // Passo 2: Gerar scripts + vídeos
    console.log('\n[2/4] Gerando roteiros e vídeos...');
    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      console.log(`\n--- Artigo ${i + 1}/${articles.length}: ${article.title} ---`);

      try {
        // Gera roteiro
        const script = await generateScript(article);
        const validation = validateScript(script);
        console.log(`[2/4] Roteiro gerado (${validation.wordCount} palavras)`);

        if (!validation.approved) {
          console.error('[2/4] Roteiro reprovado:', validation.reasons);
          results.push({ article, script, validation, video: { success: false, error: validation.reasons.join('; ') } });
          continue;
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

        results.push({ article, script, validation, video: videoResult });
      } catch (error) {
        console.error('[2/4] Falha no artigo. Continuando batch:', {
          article: article.title,
          error: error.message
        });
        results.push({ article, video: { success: false, error: error.message } });
      }
    }

    // Passo 3: Verificar status (apenas para vídeos pendentes)
    console.log('\n[3/4] Verificando status dos vídeos...');
    const completedVideos = [];
    for (const r of results) {
      if (r.video.success) {
        const checkResult = await checkVideoStatus(r.video.videoId);
        console.log(`[3/4] ${r.article.title}: ${checkResult.status}`);
        completedVideos.push({ ...r, status: checkResult });
      }
    }

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
        console.log(`[4/4] Artigo ${cv.article.id}: ${saveResult.success ? '✅' : '❌'}`);
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
