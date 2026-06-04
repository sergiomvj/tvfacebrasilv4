/**
 * FaceBrasil Bridge — TV FaceBrasil v4
 * Lê artigos do Supabase e salva metadados dos vídeos gerados.
 */

import { envValue } from './env.mjs';

/**
 * Busca top artigos publicados dos últimos N dias.
 * @param {{ limit?: number, daysBack?: number, minViews?: number }} opts
 * @returns {Promise<Array<{ id: string, title: string, content: string, category: string, url: string, publishedAt: string, metric: { name: string, value: number }, slug: string, views: number }>>}
 */
export async function fetchTopArticles({ limit = 5, daysBack = 7, minViews = 50 } = {}) {
  const params = normalizeFetchParams({ limit, daysBack, minViews });
  const supabaseUrl = envValue('FACEBRASIL_SUPABASE_URL', 'SUPABASE_URL');
  const supabaseKey = envValue(
    'FACEBRASIL_SUPABASE_SERVICE_ROLE_KEY',
    'FACEBRASIL_SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  const isMock = !isUsableSupabaseConfig(supabaseUrl, supabaseKey);

  if (isMock) {
    console.log('[Bridge Mock] Buscando artigos mockados...', params);
    return getMockArticles(params);
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - params.daysBack);

  console.log('[Bridge] Buscando artigos:', params);

  const { data, error } = await supabase
    .from('articles')
    .select('id, title, content, excerpt, category_id, category, views, slug, url, published_at, created_at')
    .eq('status', 'PUBLISHED')
    .gte('views', params.minViews)
    .gte('created_at', dateFrom.toISOString())
    .order('views', { ascending: false })
    .limit(params.limit);

  if (error) {
    throw new Error(`FaceBrasil Supabase fetch failed: ${error.message}`);
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
  const views = Number(raw.views || 0);
  const slug = raw.slug || String(raw.id);
  const publishedAt = raw.published_at || raw.created_at || new Date().toISOString();

  return {
    id: raw.id,
    title: raw.title,
    content: raw.content || raw.excerpt || '',
    category: raw.category || raw.category_id || 'general',
    url: raw.url || buildFaceBrasilArticleUrl(slug),
    publishedAt,
    metric: {
      name: 'views',
      value: views
    },
    slug,
    views
  };
}

function normalizeFetchParams({ limit, daysBack, minViews }) {
  return {
    limit: positiveInteger(limit, 5, 'limit'),
    daysBack: positiveInteger(daysBack, 7, 'daysBack'),
    minViews: nonNegativeInteger(minViews, 50, 'minViews')
  };
}

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`[Bridge] Parâmetro inválido: ${name} deve ser inteiro positivo.`);
  }
  return parsed;
}

function nonNegativeInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`[Bridge] Parâmetro inválido: ${name} deve ser inteiro >= 0.`);
  }
  return parsed;
}

function buildFaceBrasilArticleUrl(slug) {
  const baseUrl = envValue('FACEBRASIL_SITE_URL') || 'https://facebrasil.com';
  return `${baseUrl.replace(/\/$/, '')}/${slug}`;
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
function getMockArticles({ limit, minViews }) {
  return [
    { id: 'mock-001', title: 'Novas regras de imigração nos EUA em 2026', content: 'O governo americano anunciou novas regras de imigração que afetam diretamente milhares de brasileiros. As principais mudanças incluem prazos mais curtos para renovação de visto e novas taxas para green card.', category: 'imigracao', slug: 'novas-regras-imigracao-2026', views: 1520, published_at: '2026-06-04T12:00:00Z' },
    { id: 'mock-002', title: 'Melhores cidades dos EUA para brasileiros morarem', content: 'Pesquisa recente aponta as 5 melhores cidades americanas para brasileiros. Florida lidera o ranking seguida por Massachusetts e California. Custo de vida e oportunidades de trabalho foram os critérios principais.', category: 'cultura', slug: 'melhores-cidades-brasileiros-eua', views: 890, published_at: '2026-06-03T12:00:00Z' },
    { id: 'mock-003', title: 'Como tirar cidadania americana passo a passo', content: 'O processo de naturalização nos Estados Unidos pode levar de 6 a 18 meses. Neste guia completo explicamos cada etapa desde o formulário N-400 até a cerimônia de juramento.', category: 'direitos', slug: 'como-tirar-cidadania-americana', views: 2340, published_at: '2026-06-02T12:00:00Z' },
    { id: 'mock-004', title: 'Dólar hoje: cotação e perspectivas para o mês', content: 'O dólar comercial opera em alta nesta semana influenciado por dados de emprego nos EUA e decisões do Copom no Brasil. Especialistas projetam variação entre R$ 5,50 e R$ 5,80 até o fim do mês.', category: 'economia', slug: 'dolar-hoje-cotacao-perspectivas', views: 3100, published_at: '2026-06-01T12:00:00Z' },
    { id: 'mock-005', title: 'Festival brasileiro reúne milhares em Massachusetts', content: 'O Brazilian Day em Framingham aconteceu no último sábado com música, comida típica e apresentações culturais. Mais de 5 mil pessoas participaram do evento que já é tradição na região.', category: 'eventos', slug: 'festival-brasileiro-massachusetts', views: 670, published_at: '2026-05-31T12:00:00Z' }
  ]
    .filter(article => article.views >= minViews)
    .slice(0, limit)
    .map(article => normalizeArticle(article));
}
