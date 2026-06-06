#!/usr/bin/env node
/**
 * Comparação HeyGen vs OpenRouter Video
 *
 * Uso:
 *   node scripts/compare-video-providers.mjs
 *   node scripts/compare-video-providers.mjs --mock       # Apenas mock
 *   node scripts/compare-video-providers.mjs --model=x-ai/grok-imagine-video
 *   node scripts/compare-video-providers.mjs --dry-run    # Só mostra o plano
 *
 * Gera relatório no console e em .aiox/comparison-report.json
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { envBool } from '../src/env.mjs';

const isMock = envBool(true, 'TVFACEBRASIL_HEYGEN_MOCK', 'HEYGEN_MOCK') || process.argv.includes('--mock');
const isDryRun = process.argv.includes('--dry-run');
const explicitModel = process.argv.find(a => a.startsWith('--model='))?.split('=')[1];

// Muda mock pra true se --mock foi passado
if (process.argv.includes('--mock')) {
  process.env.TVFACEBRASIL_HEYGEN_MOCK = 'true';
}

// Test prompts — artigos reais do FBR.NEWS
const TEST_PROMPTS = [
  {
    title: 'Novas regras de imigração',
    topic: 'imigração',
    prompt: 'Milhares de brasileiros enfrentam novas regras de imigração nos EUA. Entenda o que muda com as novas políticas.',
    scriptText: 'Milhares de brasileiros enfrentam novas regras de imigração nos EUA. O governo americano anunciou mudanças significativas que afetam diretamente a comunidade brasileira.'
  },
  {
    title: 'Custo de vida nos EUA',
    topic: 'economia',
    prompt: 'Custo de vida nos Estados Unidos em 2026: aluguel, alimentação e saúde continuam subindo.',
    scriptText: 'O custo de vida nos Estados Unidos continua subindo em 2026. Aluguel, alimentação e plano de saúde são os principais vilões do orçamento das famílias brasileiras.'
  }
];

async function runComparison() {
  console.log('==================================================');
  console.log('📊 Comparação de Providers de Vídeo');
  console.log(`   Modo: ${isMock ? 'MOCK' : 'REAL'}`);
  if (explicitModel) console.log(`   Modelo OpenRouter: ${explicitModel}`);
  if (isDryRun) console.log('   🏁 Dry run — apenas listando testes\n');
  console.log('==================================================\n');

  if (isDryRun) {
    TEST_PROMPTS.forEach((t, i) => {
      console.log(`Teste ${i + 1}: ${t.title}`);
      console.log(`  Prompt: "${t.prompt.slice(0, 80)}..."`);
      console.log(`  Roteiro: ${t.scriptText.length} chars`);
      console.log(`  HeyGen: ${isMock ? 'mock' : 'real'}`);
      console.log(`  OpenRouter: ${explicitModel || 'modelo padrão'} ${isMock ? '(mock)' : ''}`);
      console.log();
    });
    console.log('Para executar, remova --dry-run\n');
    return;
  }

  const results = { timestamp: new Date().toISOString(), mock: isMock, tests: [] };

  for (const test of TEST_PROMPTS) {
    console.log(`--- Teste: ${test.title} ---\n`);

    // 1. HeyGen
    console.log('[HeyGen] Gerando...');
    let heygenResult;
    if (isMock) {
      const { checkVideoStatus } = await import('../src/heygen-client.mjs');
      heygenResult = await checkVideoStatus(`mock-${Date.now()}`, { maxPollTime: 10_000, interval: 1_000 });
      console.log(`[HeyGen] Status: ${heygenResult.status}, URL: ${heygenResult.url || 'N/A'}\n`);
    } else {
      const { generateShort } = await import('../src/heygen-client.mjs');
      heygenResult = await generateShort(test.scriptText);
      console.log(`[HeyGen] Status: ${heygenResult.success}, VideoID: ${heygenResult.videoId || 'N/A'}\n`);
    }

    // 2. OpenRouter Video
    console.log(`[OpenRouter] Gerando com ${explicitModel || 'padrão'}...`);
    const { generateVideo } = await import('../src/openrouter-video-client.mjs');
    const openRouterResult = await generateVideo({
      prompt: test.prompt,
      model: explicitModel,
      duration: 10
    });
    console.log(`[OpenRouter] Status: ${openRouterResult.status}, Sucesso: ${openRouterResult.success}`);
    console.log(`  Duração: ${openRouterResult.duration}s`);
    if (openRouterResult.success) {
      console.log(`  URL: ${openRouterResult.videoUrl}`);
    }
    if (openRouterResult.error) {
      console.log(`  Erro: ${openRouterResult.error}`);
    }
    console.log();

    results.tests.push({
      title: test.title,
      heygen: {
        provider: 'heygen',
        status: heygenResult.status,
        videoId: heygenResult.videoId || heygenResult.videoUrl?.split('/').pop() || null,
        url: heygenResult.url || null,
        success: heygenResult.status === 'completed' || heygenResult.success
      },
      openrouter: {
        provider: 'openrouter',
        model: openRouterResult.model,
        status: openRouterResult.status,
        videoId: openRouterResult.videoId || null,
        url: openRouterResult.videoUrl || null,
        success: openRouterResult.success,
        duration: openRouterResult.duration,
        error: openRouterResult.error || null
      }
    });
  }

  // Summary
  console.log('==================================================');
  console.log('📊 Resumo da Comparação');
  console.log('==================================================\n');

  for (const t of results.tests) {
    const h = t.heygen.success ? '✅' : '❌';
    const o = t.openrouter.success ? '✅' : '❌';
    console.log(`${t.title}`);
    console.log(`  HeyGen:     ${h} ${t.heygen.status}`);
    console.log(`  OpenRouter: ${o} ${t.openrouter.status}${t.openrouter.error ? ' — ' + t.openrouter.error : ''}`);
    console.log();
  }

  // Salva relatório
  const reportDir = path.resolve(process.cwd(), '.aiox');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'comparison-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`📁 Relatório salvo em: ${reportPath}`);

  return results;
}

runComparison().catch(err => {
  console.error('[Comparison] Erro:', err);
  process.exit(1);
});