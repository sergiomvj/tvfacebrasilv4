# TV FaceBrasil v4

MVP Node.js para transformar artigos FaceBrasil em roteiros e vídeos curtos 9:16 com avatar digital.

## Setup local

```bash
npm install
cp .env.template .env
```

Para teste sem consumir APIs reais:

```bash
npm test
```

O teste força:

```text
TVFACEBRASIL_HEYGEN_MOCK=true
TVFACEBRASIL_LLM_MOCK=true
```

## Comandos

```bash
npm test                 # ciclo E2E mock/offline
npm run smoke:aiox       # valida squads/tasks/workflow declarativo em dry-run mock
npm run smoke:persona    # valida Persona Bible + Prompt Composer
npm run smoke:providers  # valida catálogo de modelos OpenRouter Video
npm run once             # roda um ciclo usando as variáveis do .env
npm run daily            # roda ciclo e agenda a cada 30 minutos
```

## Providers

Texto:

- Principal: OpenRouter (`TVFACEBRASIL_OPENROUTER_API_KEY`, `TVFACEBRASIL_OPENROUTER_MODEL_TEXT`)
- Fallback: OpenAI (`TVFACEBRASIL_OPENAI_API_KEY`, `TVFACEBRASIL_OPENAI_MODEL_TEXT`)
- Compatibilidade temporária: `LLM_API_KEY`, `LLM_MODEL`

Vídeo:

- Produção MVP: HeyGen
- Laboratório controlado: OpenRouter Video com `TVFACEBRASIL_OPENROUTER_VIDEO_ENABLED=true`

## Segurança operacional

- Não commitar `.env`, chaves, tokens, `.pem` ou secrets.
- `npm test` não consome créditos reais.
- OpenRouter Video não entra no fluxo diário sem aprovação explícita.
- Produção HeyGen real depende de `TVFACEBRASIL_HEYGEN_MOCK=false` e chave configurada.

## Persona

O template de persona fica em:

```text
squads/tv-facebrasil/templates/persona-bible-template.md
```

Ele é usado para manter aparência, roupa, cenário e regras negativas consistentes entre gerações de vídeo.
