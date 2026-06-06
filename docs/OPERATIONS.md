# TV FaceBrasil v4 — Documentação Operacional

> Pipeline de geração automática de vídeos com avatares digitais (HeyGen + OpenRouter Video).

## Stack

| Componente | Tecnologia | Notas |
|---|---|---|
| Runtime | Node.js 22 (ESM) | `.mjs` — módulos ES nativos |
| Container | Docker (Alpine) | 190MB, non-root |
| LLM | OpenRouter | `deepseek/deepseek-v4-flash` |
| Vídeo #1 | HeyGen API v3 | Produção MVP |
| Vídeo #2 | OpenRouter Video | Experimental |
| Base | Supabase | Notícias, metadados |
| Orquestrador | Easypanel + Docker | Docker Swarm |

## Estrutura de Diretórios

```
tvfacebrasilv4/
├── src/
│   ├── index.js                 # Entrypoint — workflow principal
│   ├── heygen-client.mjs        # Cliente HeyGen (round-robin, polling)
│   ├── openrouter-video-client.mjs # Cliente OpenRouter Video
│   ├── video-provider-catalog.mjs  # Catálogo de modelos + adapters
│   ├── script-generator.mjs     # Geração de roteiro via LLM
│   ├── script-validator.mjs     # Validação de qualidade editorial
│   ├── llm-provider.mjs         # Roteamento de LLM
│   ├── prompt-composer.mjs      # Compositor + Persona Bible
│   ├── persona-prompt.mjs       # Prompts de persona
│   ├── editorial-payload.mjs    # Payload editorial
│   ├── facebrasil-bridge.mjs    # Bridge com Supabase
│   ├── state-tracker.mjs        # Persistência JSONL
│   └── env.mjs                  # Env vars utilitário
├── scripts/
│   ├── compare-video-providers.mjs  # Comparação HeyGen vs OpenRouter
│   ├── setup-production-cron.sh      # Configura cron diário
│   └── github-app-token.mjs          # Token GitHub App
├── squads/tv-facebrasil/templates/
│   └── persona-bible-template.md     # Persona Bible v1
├── .aiox/                        # Estado local (ignorado no .dockerignore)
│   ├── production-state.jsonl    # Histórico de produção
│   ├── comparison-report.json    # Resultado da comparação
│   ├── logs/                     # Logs do cron
│   ├── roundrobin-state.json     # Estado do round-robin
│   └── runs/                     # Artefatos do AIOX Dev Harness
├── Dockerfile                    # Build reproduzível
└── .dockerignore
```

## CLI flags

```bash
node src/index.js                         # Executa uma vez (padrão: 5 artigos, 7 dias)
node src/index.js --limit=3               # Processa 3 artigos
node src/index.js --daysBack=14           # Artigos dos últimos 14 dias
node src/index.js --dry-run               # Lista artigos sem executar nada
node src/index.js --daily                 # Loop contínuo a cada 30min
node src/index.js --once                  # Executa uma vez e sai (padrão)
```

## Modo Mock (desenvolvimento)

Sem credenciais HeyGen, o sistema roda em modo mock:

```bash
TVFACEBRASIL_HEYGEN_MOCK=true TVFACEBRASIL_LLM_MOCK=true node src/index.js --limit=3
```

Mock simula: geração de script (LLM) + geração de vídeo (HeyGen) + polling de status.

## Variáveis de Ambiente

### HeyGen (Produção)
| Variável | Obrigatório | Descrição |
|---|---|---|
| `TVFACEBRASIL_HEYGEN_A_API_KEY` | ✅ | API Key Conta-A |
| `TVFACEBRASIL_HEYGEN_A_AVATAR_ID` | ❌ | Avatar ID (padrão: avatar-1) |
| `TVFACEBRASIL_HEYGEN_A_VOICE_ID` | ❌ | Voice ID (padrão: voz-masc-ptbr) |
| `TVFACEBRASIL_HEYGEN_B_API_KEY` | ❌ | API Key Conta-B (ativa multi-account) |
| `TVFACEBRASIL_HEYGEN_B_AVATAR_ID` | ❌ | Avatar ID (padrão: avatar-2) |
| `TVFACEBRASIL_HEYGEN_B_VOICE_ID` | ❌ | Voice ID (padrão: voz-fem-ptbr) |
| `TVFACEBRASIL_HEYGEN_CONCURRENCY` | ❌ | Concorrência (padrão: 2) |
| `TVFACEBRASIL_HEYGEN_MOCK` | ❌ | Modo mock |

### LLM
| Variável | Obrigatório | Descrição |
|---|---|---|
| `TVFACEBRASIL_OPENROUTER_API_KEY` | ✅ | API Key OpenRouter |
| `TVFACEBRASIL_OPENROUTER_MODEL_TEXT` | ❌ | Modelo texto (padrão: deepseek/deepseek-v4-flash) |
| `TVFACEBRASIL_LLM_MOCK` | ❌ | Modo mock |

### OpenRouter Video (Experimental)
| Variável | Obrigatório | Descrição |
|---|---|---|
| `TVFACEBRASIL_OPENROUTER_VIDEO_ENABLED` | ❌ | Ativa geração OpenRouter |
| `TVFACEBRASIL_OPENROUTER_VIDEO_MODEL` | ❌ | Modelo #1 (padrão: bytedance/seedance-2.0) |
| `TVFACEBRASIL_OPENROUTER_MODEL` | ❌ | Legacy — alias para model #1 |

### Supabase
| Variável | Obrigatório | Descrição |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL do projeto |
| `SUPABASE_ANON_KEY` | ✅ | Anon key |
| `TVFACEBRASIL_DB_ARTICLE_TABLE` | ❌ | Tabela de artigos (padrão: articles) |

## Docker

```bash
# Build
docker build -t tvfacebrasilv4:latest .

# Executar em mock
docker run --rm \
  -e TVFACEBRASIL_HEYGEN_MOCK=true \
  -e TVFACEBRASIL_LLM_MOCK=true \
  tvfacebrasilv4:latest src/index.js --limit=3

# Executar com Supabase (produção — requer .env)
docker run --rm \
  --env-file .env \
  -v $(pwd)/.aiox:/app/.aiox \
  tvfacebrasilv4:latest src/index.js --limit=5 --daily
```

## Cron de Produção

```bash
# Configurar cron (dry-run — seguro)
sudo bash scripts/setup-production-cron.sh --dry-run

# Ativar produção real (requer env vars configuradas)
sudo bash scripts/setup-production-cron.sh --production
```

O script adiciona entrada no crontab do sistema (6h diário). O `--daily` interno mantém loop a cada 30min.

## Fluxo de Produção

1. **Busca artigos** — Top artigos do Supabase (views, recência)
2. **Dedup** — Filtra artigos já processados no ciclo
3. **Gera roteiro** — LLM via OpenRouter
4. **Valida roteiro** — Qualidade editorial mínima
5. **Gera vídeo** — HeyGen (round-robin entre contas)
6. **Polling** — Verifica status com backoff exponencial
7. **Salva metadados** — URL, videoId, conta, avatar
8. **Registra** — State tracker JSONL

## Providers de Vídeo

| Provider | Status | Uso |
|---|---|---|
| HeyGen | ✅ Produção MVP | Fluxo diário |
| OpenRouter Video | 🔬 Experimental | `scripts/compare-video-providers.mjs` |

## Comparação de Providers

```bash
node scripts/compare-video-providers.mjs --mock       # Teste seguro
node scripts/compare-video-providers.mjs --dry-run     # Apenas planeja
node scripts/compare-video-providers.mjs               # Com OpenRouter (requer key)
node scripts/compare-video-providers.mjs --model=x-ai/grok-imagine-video
```

Relatório: `.aiox/comparison-report.json`

## Persona Bible

Template: `squads/tv-facebrasil/templates/persona-bible-template.md`

- ID: `tvfacebrasil-presenter-v1`
- Aparência fixa para consistência entre modelos
- Bloco visual em inglês para modelos OpenRouter
- Registra persona+versão em cada execução

## Manutenção

```bash
# Logs
tail -f .aiox/logs/production-cron.log

# Estado de produção
cat .aiox/production-state.jsonl

# Métricas
cat .aiox/metrics.json

# Resetar ciclo (se o processo morrer)
rm -f .aiox/current-cycle.json
```

---

*Documentação operacional — TV FaceBrasil v4*
*Última atualização: 6 jun 2026*