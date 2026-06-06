# Tarefa: Story 4.4 - Modo single-account HeyGen
**Issue:** #12
**Repo:** sergiomvj/tvfacebrasilv4
**Branch:** main
**Escopo:** Refatorar buildAccountPool() em heygen-client.mjs para criar contas dinamicamente baseado em env vars, em vez de lista fixa. Conta-A é sempre default. Conta-B só entra se a env existir.
## Arquivos permitidos (ALTERAR APENAS ESTES)
- `src/heygen-client.mjs`
## Arquivos somente leitura (NÃO ALTERAR)
- `src/env.mjs`
- `src/llm-provider.mjs`
- `src/script-generator.mjs`
- `src/script-validator.mjs`
- `src/persona-prompt.mjs`
- `src/editorial-payload.mjs`
- `src/video-provider-catalog.mjs`
- `src/facebrasil-bridge.mjs`
- `src/index.js`

## Arquivos proibidos (NUNCA TOCAR)
- `.env*`
- `*.pem`
- `*.key`
- `*secret*`
- `*token*`
- `.git/credentials`
- `id_rsa*`

## Critérios de aceite
1. Se apenas TVFACEBRASIL_HEYGEN_A_API_KEY estiver configurada, buildAccountPool retorna somente Conta-A
2. Conta-B so entra no pool quando TVFACEBRASIL_HEYGEN_B_API_KEY existir e nao estiver vazia
3. Logs indicam single-account ou multi-account, sem imprimir chaves
4. Round-robin nao seleciona contas sem API key
5. npm test passa sem erros
## Regras
- Altere APENAS os arquivos listados em "Arquivos permitidos"
- Não modifique arquivos readonly ou proibidos
- Execute as validações após alterar
- Commite e faça push ao final
- Mantenha o código limpo e seguindo os padrões do projeto
## Repositório
Diretório de trabalho: o repo atual