# Tarefa: Story 4.3 - Polling de status do vídeo
**Issue:** #11
**Repo:** sergiomvj/tvfacebrasilv4
**Branch:** main
**Escopo:** Aprimorar checkVideoStatus com polling com backoff, timeout configurável, simulação de estados pendente/completo/falha/timeout em modo mock, e tratamento de falhas sem interromper batch.
## Arquivos permitidos (ALTERAR APENAS ESTES)
- `src/heygen-client.mjs`
- `src/index.js`
## Arquivos somente leitura (NÃO ALTERAR)
- `src/env.mjs`
- `src/llm-provider.mjs`
- `src/script-generator.mjs`
- `src/script-validator.mjs`
- `src/persona-prompt.mjs`
- `src/editorial-payload.mjs`
- `src/video-provider-catalog.mjs`
- `src/facebrasil-bridge.mjs`

## Arquivos proibidos (NUNCA TOCAR)
- `.env*`
- `*.pem`
- `*.key`
- `*secret*`
- `*token*`
- `.git/credentials`
- `id_rsa*`

## Critérios de aceite
1. checkVideoStatus aceita opcoes: videoId, maxPollTime (default 120s), interval (default 5s)
2. Em modo mock, simula status: pending (2x), depois completed, ou failed se timeout
3. Implementa backoff exponencial nas consultas de status
4. Timeout configurável via parametro maxPollTime
5. Salva URL/metadata no banco quando completed
6. Marca falhas sem interromper o lote (index.js continua processando)
7. npm test passa sem erros
## Regras
- Altere APENAS os arquivos listados em "Arquivos permitidos"
- Não modifique arquivos readonly ou proibidos
- Execute as validações após alterar
- Commite e faça push ao final
- Mantenha o código limpo e seguindo os padrões do projeto
## Repositório
Diretório de trabalho: o repo atual