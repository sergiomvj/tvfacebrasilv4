# Tarefa: Story 4.2 - Implementar round-robin de contas e avatares
**Issue:** #10
**Repo:** sergiomvj/tvfacebrasilv4
**Branch:** main
**Escopo:** Aprimorar o módulo heygen-client.mjs com round-robin completo de contas e avatares: alternância, preferência por categoria, registro de uso por artigo, e controle de concorrência configurável. Estado simples sem scheduler complexo.
## Arquivos permitidos (ALTERAR APENAS ESTES)
- `src/heygen-client.mjs`
- `src/index.js`
- `src/facebrasil-bridge.mjs`
## Arquivos somente leitura (NÃO ALTERAR)
- `src/env.mjs`
- `src/llm-provider.mjs`
- `src/script-generator.mjs`
- `src/script-validator.mjs`
- `src/persona-prompt.mjs`
- `src/editorial-payload.mjs`
- `src/video-provider-catalog.mjs`

## Arquivos proibidos (NUNCA TOCAR)
- `.env*`
- `*.pem`
- `*.key`
- `*secret*`
- `*token*`
- `.git/credentials`
- `id_rsa*`

## Critérios de aceite
1. Alterna Conta-A/Avatar-1 e Conta-B/Avatar-2 no round-robin
2. getNextAccount aceita category opcional e prefere Conta-A para notícias 'duras' (imigracao, direitos, economia, politica, leis) e Conta-B para lifestyle (cultura, eventos, entretenimento, turismo)
3. Registra qual conta/avatar foi usado em cada artigo no metadado salvo por saveVideoMetadata
4. Implementa limite de concorrência configurável (TVFACEBRASIL_HEYGEN_CONCURRENCY, default 2) — não dispara mais que N requisições simultâneas
5. npm test passa sem erros
6. Estado do round-robin é persistido entre ciclos (arquivo .aiox/roundrobin-state.json ou similar simples)
## Regras
- Altere APENAS os arquivos listados em "Arquivos permitidos"
- Não modifique arquivos readonly ou proibidos
- Execute as validações após alterar
- Commite e faça push ao final
- Mantenha o código limpo e seguindo os padrões do projeto
## Repositório
Diretório de trabalho: o repo atual