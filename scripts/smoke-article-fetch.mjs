#!/usr/bin/env node
import { fetchTopArticles } from '../src/facebrasil-bridge.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const articles = await fetchTopArticles({ limit: 3, daysBack: 7, minViews: 800 });

assert(articles.length === 3, `esperado 3 artigos, recebeu ${articles.length}`);

for (const article of articles) {
  assert(article.id, 'article.id ausente');
  assert(article.title, 'article.title ausente');
  assert(article.content, `article.content ausente em ${article.id}`);
  assert(article.category, `article.category ausente em ${article.id}`);
  assert(article.url, `article.url ausente em ${article.id}`);
  assert(article.publishedAt, `article.publishedAt ausente em ${article.id}`);
  assert(article.metric?.name === 'views', `metric.name invalida em ${article.id}`);
  assert(article.metric.value >= 800, `metric.value abaixo de minViews em ${article.id}`);
}

console.log('[Article Fetch Smoke] Artigos candidatos validados:', {
  count: articles.length,
  fields: ['title', 'content', 'category', 'url', 'publishedAt', 'metric'],
  minMetric: Math.min(...articles.map(article => article.metric.value))
});
