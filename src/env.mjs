const PLACEHOLDER_VALUES = new Set([
  '',
  'sua_chave_aqui',
  'seu_app_id_aqui',
  'sua_url_aqui',
  'your-anon-key',
  'your-service-role-key',
  'https://your-project.supabase.co'
]);

export function envValue(...keys) {
  for (const key of keys) {
    const value = process.env[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }

  return undefined;
}

export function envBool(defaultValue, ...keys) {
  const value = envValue(...keys);
  if (value === undefined) {
    return defaultValue;
  }

  return String(value).trim().toLowerCase() === 'true';
}

export function hasUsableValue(value) {
  return Boolean(value && !PLACEHOLDER_VALUES.has(String(value).trim()));
}
