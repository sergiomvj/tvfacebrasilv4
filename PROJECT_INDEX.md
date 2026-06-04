# TV FaceBrasil v4 - Project Index

Last verified: 2026-06-04 17:32 UTC
Source of truth repo: `sergiomvj/tvfacebrasilv4`
Legacy repo: `sergiomvj/tvfacebrasil` (do not use for v4 execution)

## Current Operational Status

- Repo: https://github.com/sergiomvj/tvfacebrasilv4
- Main branch: `main`
- Latest verified remote commit: `623d454 Add project source-of-truth index`
- Operational reset issue: https://github.com/sergiomvj/tvfacebrasilv4/issues/22
- Local mock E2E: passing
- Persona smoke test: passing
- Provider catalog smoke test: passing
- Daily mode: fixed so `npm run daily` keeps the cron process alive
- Current local mock daily process: running via `node src/index.js --daily`
- Current local mock daily PID file: `logs/tvfacebrasilv4-daily-mock.pid`
- Current local mock daily log: `logs/tvfacebrasilv4-daily-mock.log`
- Production API consumption: not approved in this index; use mock/offline until PO/Sergio approval

## Core Documents

- README: https://github.com/sergiomvj/tvfacebrasilv4/blob/main/README.md
- PRD file: https://github.com/sergiomvj/tvfacebrasilv4/blob/main/docs/PRD.md
- PRD issue: https://github.com/sergiomvj/tvfacebrasilv4/issues/21
- Story Framework issue: https://github.com/sergiomvj/tvfacebrasilv4/issues/1

## Stories

- #2 Story 1.1 - Inicializar projeto TV FaceBrasil v4
- #3 Story 1.2 - Registrar squads e workflows AIOX
- #4 Story 2.1 - Implementar fetch de artigos candidatos
- #5 Story 2.2 - Preparar payload editorial para roteiro
- #6 Story 3.1 - Implementar script generator
- #7 Story 3.2 - Validar qualidade editorial minima
- #8 Story 3.3 - Implementar roteamento de LLM para texto
- #9 Story 4.1 - Implementar cliente HeyGen v3
- #10 Story 4.2 - Implementar round-robin de contas e avatares
- #11 Story 4.3 - Polling de status do video
- #12 Story 4.4 - Modo single-account HeyGen
- #13 Story 4B.1 - Configurar catalogo de modelos de video OpenRouter
- #14 Story 4B.2 - Criar modo de comparacao HeyGen vs OpenRouter Video
- #15 Story 4B.3 - Criar Persona Bible e Prompt Composer
- #16 Story 5.1 - Implementar workflow daily-production
- #17 Story 5.2 - Persistir estado minimo de producao
- #18 Story 6.1 - Dockerizar servico
- #19 Story 6.2 - Configurar cron diario de producao
- #20 Story 6.3 - Documentacao operacional

## Environment Variables

Expected project-specific names:

- `FACEBRASIL_SUPABASE_URL`
- `FACEBRASIL_SUPABASE_ANON_KEY`
- `FACEBRASIL_SUPABASE_SERVICE_ROLE_KEY`
- `TVFACEBRASIL_OPENROUTER_API_KEY`
- `TVFACEBRASIL_OPENROUTER_MODEL_TEXT`
- `TVFACEBRASIL_OPENAI_API_KEY`
- `TVFACEBRASIL_OPENAI_MODEL_TEXT`
- `TVFACEBRASIL_HEYGEN_A_API_KEY`
- `TVFACEBRASIL_HEYGEN_A_AVATAR_ID`
- `TVFACEBRASIL_HEYGEN_A_VOICE_ID`
- Optional: `TVFACEBRASIL_HEYGEN_B_API_KEY`
- Optional: `TVFACEBRASIL_HEYGEN_B_AVATAR_ID`
- Optional: `TVFACEBRASIL_HEYGEN_B_VOICE_ID`

GitHub Secrets are for GitHub Actions only. Easypanel/Docker production must receive the same values as runtime environment variables.

## Safe Commands

These commands do not consume real API credits when mock variables are enabled:

```bash
npm test
npm run smoke:persona
npm run smoke:providers
TVFACEBRASIL_HEYGEN_MOCK=true TVFACEBRASIL_LLM_MOCK=true npm run daily
```

## Execution Rule

Do not develop from loose chat context. Every material change must be tied to a GitHub Issue and use the required flow:

`PO -> DevMaster -> Dev -> QA -> PO Review`

QA may return to Dev at most two times. After that, PO resolves or escalates to Human Interaction Required.

## Immediate Next Steps

1. Sergio/PO approves or edits the PRD in issue #21.
2. PO validates Story Framework issue #1.
3. DevMaster starts only the next approved story.
4. Keep runtime in mock/offline until explicit approval to consume HeyGen/OpenRouter/OpenAI production credits.
