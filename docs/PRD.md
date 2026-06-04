# TV FaceBrasil v4 - PRD Tecnico

**Data:** 2026-06-03
**Autor:** David (OpenClaw)
**Versao:** 1.0
**Framework:** AIOX (SynkraAI)
**Status:** Draft para aprovacao

---

## 1. Resumo Executivo

TV FaceBrasil v4 e um sistema de geracao automatizada de videos Short (9:16, ate 1 minuto) a partir de artigos do portal FaceBrasil. Usa 2 contas HeyGen Creator (30 min cada = 60 min/mes total) e 2 avatares diferentes para variedade de apresentacao. Orquestrado via AIOX como framework de agentes, sem n8n, sem dashboard complexo. MVP em producao em 48h.

**Stack:** Node.js + AIOX + HeyGen v3 API + Supabase + OpenAI/DeepSeek

---

## 2. Contexto

### 2.1 Historico
- 3 versoes anteriores falharam por super-engenharia (n8n, Control Tower, agentes multi-etapa, renderizacao local)
- Repositorios existentes: `sergiomvj/tvfacebrasil` (legado HeyGen v2) e `sergiomvj/facebrasil` (artigos + analytics)

### 2.2 Por que agora
- FaceBrasil tem 17 anos de conteudo editorial sem presenca em video consistente
- YouTube e hoje pre-requisito, nao diferencial
- HeyGen API v3 esta madura e confiavel
- AIOX permite orquestracao sem overhead de infra

### 2.3 Por que AIOX
- Orquestracao leve: agentes especializados sem middleware pesado
- CLI-first: toda operacao via terminal, sem UI obrigatoria
- Task-first: cada operacao e uma task independente e reutilizavel
- Squads: modulos de agentes para dominios especificos
- Ja roda em Node.js: compativel com o ecossistema FBR existente
- Open source: sem lock-in de plataforma

---

## 3. Arquitetura do Sistema

### 3.1 Visao Geral (AIOX-First)

```text
FaceBrasil artigos/Supabase
        |
        v
facebrasil-bridge-squad
        |
        v
tv-facebrasil-squad
        |
        +--> scriptwriter -> roteiro PT-BR Short
        |
        +--> video-producer -> HeyGen API v3
        |
        v
status/metadata do video
```

### 3.2 Componentes

**AIOX Core:**
- `@aiox-master` (Pax): orquestrador principal. Coordena workflows e squads
- `tv-facebrasil-squad`: squad custom para geracao de videos
- `facebrasil-bridge-squad`: squad custom para bridge com FaceBrasil
- Workflows: `daily-production`, `generate-short`, `check-status`

**tv-facebrasil-squad (Custom):**
```text
squads/tv-facebrasil/
├── squad.yaml
├── agents/
│   ├── scriptwriter.md
│   └── video-producer.md
├── tasks/
│   ├── generate-short.md
│   └── check-status.md
├── workflows/
│   └── daily-production.yaml
├── config/
│   ├── heygen-config.yaml
│   └── avatar-config.yaml
└── templates/
    └── script-template.md
```

**facebrasil-bridge-squad (Custom):**
```text
squads/facebrasil-bridge/
├── squad.yaml
├── agents/
│   └── article-fetcher.md
├── tasks/
│   ├── fetch-top-articles.md
│   └── update-video-status.md
└── config/
    └── supabase-config.yaml
```

### 3.3 Workflow de Producao Diaria

```yaml
name: daily-production
agents: [article-fetcher, scriptwriter, video-producer]
steps:
  - task: fetch-top-articles
    params:
      limit: 5
      minViews: 100
      daysBack: 7
    output: articles.json

  - task: generate-short
    forEach: articles.json
    params:
      article: $item
      avatar: $roundRobin(avatars)
      account: $roundRobin(accounts)
      maxDuration: 60
    output: videos.json

  - task: check-status
    params:
      jobs: videos.json
      pollInterval: 30
      maxWait: 300
    output: completed-videos.json

  - task: update-video-status
    params:
      videos: completed-videos.json
```

---

## 4. HeyGen - Configuracao e Limites

### 4.1 Plano Creator (Pessoal)

| Item | Por Conta | 2 Contas |
|---|---|---|
| Minutos de video/mes | 30 min | 60 min |
| Creditos/mes (1 credito = 1s) | 1.800 | 3.600 |
| Resolucao maxima | 1080p | 1080p |
| Avatares | Biblioteca completa | Biblioteca completa |
| API Key | Sim | Sim |
| Videos simultaneos | Ate 3 | Ate 6 |
| Custo estimado | ~$29/mes | ~$58/mes total |

### 4.2 Capacidade Real

| Formato | Duracao | Videos/mes (1 conta) | Videos/mes (2 contas) |
|---|---|---|---|
| Short | 30s | 60 | 120 |
| Short | 60s | 30 | 60 |
| Misto | media 45s | 40 | 80 |

### 4.3 Gestao de Contas (Round-Robin)

```text
Conta-A -> Avatar-1 (apresentador principal)
Conta-B -> Avatar-2 (apresentador alternativo)

Round-robin:
  Artigo 01 -> Conta-A / Avatar-1
  Artigo 02 -> Conta-B / Avatar-2
  Artigo 03 -> Conta-A / Avatar-1
```

### 4.4 Payload HeyGen (Short 9:16)

```json
{
  "video_name": "FaceBrasil - {titulo_artigo}",
  "dimensions": { "width": 1080, "height": 1920 },
  "aspect_ratio": "9:16",
  "avatar": {
    "avatar_id": "{avatar-id}",
    "scale": 1.0,
    "position": "center-right"
  },
  "voice": {
    "voice_id": "{voz_ptbr}",
    "speed": 1.0,
    "emotion": "neutral"
  },
  "background": { "type": "color", "value": "#003366" },
  "caption": true,
  "max_duration": 60
}
```

---

## 5. Geracao de Roteiro

### 5.1 Template de Script

```text
[HOOK - 5s]
FATO IMPACTANTE

[INTRO - 10s]
Voce sabia que [info surpreendente]?
Eu sou [Avatar] da FaceBrasil e hoje vou te contar sobre [tema].

[CORPO - 30s]
- Ponto principal 1
- Ponto principal 2
- Dado/estatistica relevante

[CTA - 10s]
Quer saber mais?
O artigo completo esta em facebrasil.com. Ate a proxima!

[CHAPEU - 5s]
FaceBrasil - Sua comunidade brasileira nos Estados Unidos.
```

**Regras:** Maximo 150 palavras. Frases de ate 15 palavras. Hook forte nos 5s iniciais. CTA no final.

### 5.2 LLM Prompt

```text
Voce e um roteirista de Shorts de noticias para YouTube.
Formato: 9:16, duracao maxima 60s, apresentador avatar digital.
Idioma: PT-BR, tom jornalistico mas coloquial.

REGRAS:
1. Hook forte nos primeiros 5 segundos
2. Maximo 150 palavras
3. Frases de no maximo 15 palavras
4. Linguagem simples e direta
5. Termine com call to action para facebrasil.com
6. Marca no final: "FaceBrasil - Sua comunidade brasileira nos Estados Unidos"

ARTIGO:
{titulo}
{conteudo_completo}

Produza APENAS o script.
```

---

## 6. Plano de Implementacao (48h)

### Dia 1 - Setup + Squads + Servico Core (~16h)

| Atividade | Duracao | Output |
|---|---|---|
| Instalar AIOX, configurar core | 1h | AIOX funcional |
| Criar squads + manifestos | 2h | 2 squads registrados |
| Criar agents (@scriptwriter, @video-producer, @article-fetcher) | 2h | 3 agents |
| Criar tasks (fetch, generate, check) | 2h | 3 tasks |
| Implementar heygen-client.ts (round-robin) | 3h | API HeyGen OK |
| Implementar script-generator.ts | 3h | Roteiro OK |
| Implementar facebrasil-bridge.ts | 3h | Bridge Supabase OK |

### Dia 2 - Workflows + Deploy + Testes (~16h)

| Atividade | Duracao | Output |
|---|---|---|
| Criar workflow daily-production | 2h | Workflow OK |
| Testar E2E com 3 artigos reais | 3h | 3 Shorts gerados |
| Ajustar prompts e qualidade | 2h | Prompts refinados |
| Dockerizar + docker-compose | 3h | Container pronto |
| Deploy Easypanel + Traefik | 2h | Servico no ar |
| Cron job diario | 2h | Automacao ativa |
| Documentacao + relatorio | 2h | PRD publicado |

### Comandos de Setup

```bash
cd /home/sergio/.openclaw/workspace/repos/
mkdir tvfacebrasil-v4 && cd tvfacebrasil-v4
npx aiox-core init . --skip-install
npm init -y
npm install express dotenv @supabase/supabase-js openai node-cron
mkdir -p squads/tv-facebrasil/{agents,tasks,workflows,config,templates}
mkdir -p squads/facebrasil-bridge/{agents,tasks,config}
```

---

## 7. Variacao de Avatares

| Avatar | Conta | Voz | Tom | Quando usar |
|---|---|---|---|---|
| Avatar-1 | Conta-A | Voz masculina (PT-BR) | Neutro/jornalistico | Noticias diretas |
| Avatar-2 | Conta-B | Voz feminina (PT-BR) | Leve/entusiasmado | Cultura, entretenimento |

**Regra:** Round-robin simples. Se artigo e de noticia dura, prefere Avatar-1. Se e lifestyle/cultura, Avatar-2. Se neutro, alterna.

---

## 8. Riscos e Mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|---|---|---|---|
| HeyGen API rate limit (3 simultaneos/conta) | Media | Alto | Round-robin entre 2 contas = 6 simultaneos |
| Quota mensal estourar | Media | Alto | Monitorar uso via dashboard HeyGen |
| Qualidade do avatar insatisfatoria | Baixa | Medio | Testar com artigos reais no Dia 2 |
| Voz PT-BR HeyGen nao atender | Baixa | Baixo | Fallback ElevenLabs TTS |
| AIOX ter curva de aprendizado | Media | Medio | Documentacao extensa disponivel |

---

## 9. Metricas de Sucesso

| Metrica | Alvo (30 dias) |
|---|---|
| Videos gerados | 40-60 |
| Tempo medio artigo -> video | < 10 min |
| Uso de quota HeyGen | < 80% (folga) |
| Qualidade aceitavel | >= 90% sem rejeicao |
| YouTube publicado | 2-3/semana |

---

*PRD preparado para aprovacao. Proximo passo: sinal verde para iniciar a implementacao de 48h.*
