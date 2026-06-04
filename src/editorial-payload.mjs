const DEFAULT_MAX_CHARS = 2200;

export function prepareEditorialPayload(article, { maxChars = DEFAULT_MAX_CHARS } = {}) {
  if (!article || typeof article !== 'object') {
    throw new Error('Artigo inválido para payload editorial.');
  }

  const title = normalizeWhitespace(stripHtml(article.title || ''));
  const cleanContent = normalizeWhitespace(stripHtml(article.content || article.excerpt || ''));
  const summary = normalizeWhitespace(stripHtml(article.summary || article.excerpt || firstSentences(cleanContent, 2)));
  const url = normalizeUrl(article.url, article.slug);
  const tracking = {
    id: article.id,
    slug: article.slug,
    category: article.category || 'general',
    publishedAt: article.publishedAt || article.published_at || article.created_at || null,
    metric: article.metric || {
      name: 'views',
      value: Number(article.views || 0)
    }
  };

  return {
    id: article.id,
    title,
    summary,
    url,
    category: tracking.category,
    content: prioritizeContent(cleanContent, { title, summary, maxChars }),
    cta: {
      label: 'Leia a matéria completa no FaceBrasil',
      url
    },
    tracking
  };
}

export function stripHtml(value) {
  return String(value || '')
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&[a-z0-9#]+;/gi, ' ');
}

function prioritizeContent(content, { title, summary, maxChars }) {
  const blocks = [
    title ? `Titulo: ${title}` : '',
    summary ? `Resumo: ${summary}` : '',
    content
  ].filter(Boolean);

  const joined = blocks.join('\n\n');
  if (joined.length <= maxChars) return joined;

  const paragraphs = content
    .split(/\n+|(?<=[.!?])\s+/)
    .map(part => part.trim())
    .filter(part => part.length > 30);

  const selected = [];
  let size = title.length + summary.length + 20;

  for (const paragraph of paragraphs) {
    if (size + paragraph.length > maxChars) break;
    selected.push(paragraph);
    size += paragraph.length + 2;
  }

  return [
    title ? `Titulo: ${title}` : '',
    summary ? `Resumo: ${summary}` : '',
    selected.join('\n')
  ].filter(Boolean).join('\n\n').slice(0, maxChars).trim();
}

function normalizeWhitespace(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeUrl(url, slug) {
  if (url) return String(url).trim();
  const baseUrl = process.env.FACEBRASIL_SITE_URL || 'https://facebrasil.com';
  return `${baseUrl.replace(/\/$/, '')}/${slug || ''}`.replace(/\/$/, '');
}

function firstSentences(content, count) {
  return String(content || '')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(' ');
}
