#!/usr/bin/env node
import { prepareEditorialPayload } from '../src/editorial-payload.mjs';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const fixture = {
  id: 'article-001',
  title: '  <h1>Brasileiros ganham novo prazo de regularização</h1> ',
  excerpt: '<p>Medida afeta famílias brasileiras nos EUA.</p>',
  content: `
    <article>
      <script>window.noise = true;</script>
      <p>O governo anunciou uma nova etapa do processo.</p>
      <p>A orientação principal é separar documentos antes do agendamento.</p>
      <p>Especialistas recomendam atenção aos prazos e comprovantes.</p>
    </article>
  `,
  category: 'imigracao',
  slug: 'brasileiros-novo-prazo',
  url: 'https://facebrasil.com/brasileiros-novo-prazo',
  publishedAt: '2026-06-04T12:00:00Z',
  metric: { name: 'views', value: 1200 }
};

const payload = prepareEditorialPayload(fixture, { maxChars: 320 });

assert(payload.title === 'Brasileiros ganham novo prazo de regularização', 'titulo nao normalizado');
assert(payload.summary === 'Medida afeta famílias brasileiras nos EUA.', 'resumo nao normalizado');
assert(payload.url === fixture.url, 'url nao preservada');
assert(payload.content.length <= 320, 'conteudo excede limite');
assert(!payload.content.includes('<p>'), 'HTML nao removido');
assert(!payload.content.includes('window.noise'), 'script/lixo editorial nao removido');
assert(payload.content.includes('Titulo:'), 'titulo nao priorizado no payload');
assert(payload.content.includes('Resumo:'), 'resumo nao priorizado no payload');
assert(payload.tracking.id === fixture.id, 'id de rastreio nao preservado');
assert(payload.tracking.metric.value === 1200, 'metrica de rastreio nao preservada');
assert(payload.cta.url === fixture.url, 'CTA nao preserva URL');

console.log('[Editorial Payload Smoke] Payload validado:', {
  title: payload.title,
  chars: payload.content.length,
  tracking: payload.tracking
});
