/**
 * Deterministic editorial validation for short scripts.
 */

export function validateScript(script, { maxWords = 150 } = {}) {
  const reasons = [];
  const text = String(script || '').trim();
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  if (!text) {
    reasons.push('script vazio');
  }

  if (words.length > maxWords) {
    reasons.push(`script com ${words.length} palavras; limite ${maxWords}`);
  }

  if (!/\bfacebrasil\.com\b/i.test(text)) {
    reasons.push('CTA para facebrasil.com ausente');
  }

  if (!/FaceBrasil/i.test(text)) {
    reasons.push('marca FaceBrasil ausente');
  }

  const firstMeaningfulLine = text
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !/^\[[^\]]+\]$/.test(line));

  if (!firstMeaningfulLine || firstMeaningfulLine.split(/\s+/).length > 20) {
    reasons.push('hook inicial ausente ou longo demais');
  }

  return {
    approved: reasons.length === 0,
    reasons,
    wordCount: words.length
  };
}
