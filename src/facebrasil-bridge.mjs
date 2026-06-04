/**
 * FaceBrasil Bridge — TV FaceBrasil v4
 * Lê artigos do Supabase e salva metadados dos vídeos gerados.
 */

import { envValue } from './env.mjs';

/**
 * Busca top artigos publicados dos últimos N dias.
 * @param {{ limit?: number, daysBack?: number, minViews?: number }} opts
 * @returns {Promise<Array<{ id: string, title: string, content: string, category: string, slug: string, views: number }>>}
 */
export async function fetchTopArticles({ limit = 5, daysBack = 7, minViews = 50 } = {}) {
  const supabaseUrl = envValue('FACEBRASIL_SUPABASE_URL', 'SUPABASE_URL');
  const supabaseKey = envValue(
    'FACEBRASIL_SUPABASE_SERVICE_ROLE_KEY',
    'FACEBRASIL_SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  const isMock = !isUsableSupabaseConfig(supabaseUrl, supabaseKey);

  if (isMock) {
    console.log('[Bridge Mock] Buscando artigos mockados...');
    return getMockArticles(limit);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - daysBack);

  console.log('[Bridge] Buscando artigos:', { limit, daysBack, minViews });

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, content, excerpt, category_id, views, slug, published_at, created_at')
    .eq('status', 'PUBLISHED')
    .gte('views', minViews)
    .gte('created_at', dateFrom.toISOString())
    .order('views', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Bridge] Erro Supabase:', error.message);
    return getMockArticles(limit);
  }

  console.log('[Bridge] Artigos encontrados:', data?.length || 0);
  return (data || []).map(a => normalizeArticle(a));
}

/**
 * Salva metadados do vídeo gerado no banco.
 * @param {string} articleId
 * @param {{ url: string, videoId: string, duration: number, account: string, avatarId: string }} videoData
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveVideoMetadata(articleId, videoData) {
  const supabaseUrl = envValue('FACEBRASIL_SUPABASE_URL', 'SUPABASE_URL');
  const supabaseKey = envValue(
    'FACEBRASIL_SUPABASE_SERVICE_ROLE_KEY',
    'FACEBRASIL_SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  if (!isUsableSupabaseConfig(supabaseUrl, supabaseKey)) {
    console.log('[Bridge Mock] Vídeo salvo (mock):', { articleId, videoData });
    return { success: true, mock: true };
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error } = await supabase
    .from('articles')
    .update({
      tv_video_url: videoData.url,
      tv_video_id: videoData.videoId,
      tv_video_duration: videoData.duration,
      tv_video_account: videoData.account,
      tv_video_avatar: videoData.avatarId,
      tv_generated_at: new Date().toISOString()
    })
    .eq('id', articleId);

  if (error) {
    console.error('[Bridge] Erro ao salvar vídeo:', error.message);
    return { success: false, error: error.message };
  }

  console.log('[Bridge] Vídeo salvo para artigo:', articleId);
  return { success: true };
}

/** Normaliza artigo do schema FaceBrasil */
function normalizeArticle(raw) {
  return {
    id: raw.id,
    title: raw.title,
    content: raw.content || raw.excerpt || '',
    category: raw.category_id || 'general',
    slug: raw.slug,
    views: raw.views || 0,
    publishedAt: raw.published_at || raw.created_at
  };
}

function isUsableSupabaseConfig(url, key) {
  return Boolean(
    url &&
    key &&
    !url.includes('sua_url') &&
    !key.includes('sua_') &&
    key !== 'sua_service_key_aqui'
  );
}

/** Retorna artigos mockados para testes offline */
function getMockArticles(limit) {
  return [
    { id: 'mock-001', title: 'Novas regras de imigração nos EUA em 2026', content: 'O governo americano anunciou novas regras de imigração que afetam diretamente milhares de brasileiros. As principais mudanças incluem prazos mais curtos para renovação de visto e novas taxas para green card.', category: 'imigracao', slug: 'novas-regras-imigracao-2026', views: 1520 },
    { id: 'mock-002', title: 'Melhores cidades dos EUA para brasileiros morarem', content: 'Pesquisa recente aponta as 5 melhores cidades americanas para brasileiros. Florida lidera o ranking seguida por Massachusetts e California. Custo de vida e oportunidades de trabalho foram os critérios principais.', category: 'cultura', slug: 'melhores-cidades-brasileiros-eua', views: 890 },
    { id: 'mock-003', title: 'Como tirar cidadania americana passo a passo', content: 'O processo de naturalização nos Estados Unidos pode levar de 6 a 18 meses. Neste guia completo explicamos cada etapa desde o formulário N-400 até a cerimônia de juramento.', category: 'direitos', slug: 'como-tirar-cidadania-americana', views: 2340 },
    { id: 'mock-004', title: 'Dólar hoje: cotação e perspectivas para o mês', content: 'O dólar comercial opera em alta nesta semana influenciado por dados de emprego nos EUA e decisões do Copom no Brasil. Especialistas projetam variação entre R$ 5,50 e R$ 5,80 até o fim do mês.', category: 'economia', slug: 'dolar-hoje-cotacao-perspectivas', views: 3100 },
    { id: 'mock-005', title: 'Festival brasileiro reúne milhares em Massachusetts', content: 'O Brazilian Day em Framingham aconteceu no último sábado com música, comida típica e apresentações culturais. Mais de 5 mil pessoas participaram do evento que já é tradição na região.', category: 'eventos', slug: 'festival-brasileiro-massachusetts', views: 670 }
  ].slice(0, limit);
}
