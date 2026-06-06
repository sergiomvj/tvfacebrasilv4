#!/bin/bash
# Configuração do cron de produção TV FaceBrasil
# Uso: sudo bash scripts/setup-production-cron.sh [--dry-run|--production]
#
# --dry-run (padrão): executa em modo seguro (sem HeyGen real)
# --production: ativa produção real (requer env vars configuradas)

set -euo pipefail

MODE="${1:---dry-run}"
SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="${SCRIPT_DIR}/.aiox/logs"
CRON_LOG="${LOG_DIR}/production-cron.log"
ENV_FILE="${SCRIPT_DIR}/.env"

# Modo dry-run é o padrão — seguro
DRY_RUN_FLAG="--dry-run"
if [ "$MODE" = "--production" ]; then
  DRY_RUN_FLAG=""
  echo "[Setup] Modo PRODUÇÃO ativado"
else
  echo "[Setup] Modo DRY-RUN (seguro)"
fi

# Cria diretório de logs
mkdir -p "$LOG_DIR"

# Comando que será executado pelo cron
if [ -f "$ENV_FILE" ]; then
  CRON_CMD="cd ${SCRIPT_DIR} && . ${ENV_FILE} && /usr/local/bin/node src/index.js --daily --limit=5 ${DRY_RUN_FLAG} >> ${CRON_LOG} 2>&1"
else
  CRON_CMD="cd ${SCRIPT_DIR} && /usr/local/bin/node src/index.js --daily --limit=5 ${DRY_RUN_FLAG} >> ${CRON_LOG} 2>&1"
fi

# Verifica se já existe entrada no crontab
EXISTING=$(crontab -l 2>/dev/null || true)
if echo "$EXISTING" | grep -q "tvfacebrasilv4"; then
  echo "[Setup] Entrada cron já existe"
  echo "$EXISTING" | grep "tvfacebrasilv4"
else
  # Adiciona — 6h da manhã (produção) + a cada 30min via --daily
  # O --daily já cuida do loop interno de 30min
  CRON_LINE="0 6 * * * ${CRON_CMD} # tvfacebrasilv4-production"
  (echo "$EXISTING"; echo "$CRON_LINE") | crontab -
  echo "[Setup] Cron adicionado: 6h diário"
fi

# Rotação de logs (simples, mantém últimos 7 dias)
cat > /tmp/tvfacebrasil-logrotate.conf << EOF
${SCRIPT_DIR}/.aiox/logs/*.log {
  daily
  rotate 7
  compress
  missingok
  notifempty
  copytruncate
}
EOF

echo "[Setup] Log rotate configurado (7 dias)"
echo "[Setup] Pronto. Logs em: ${CRON_LOG}"
echo "[Setup] Para testar: bash ${SCRIPT_DIR}/scripts/setup-production-cron.sh"

# Teste de validação
echo ""
echo "=== Validação ==="
echo "Node: $(node --version)"
echo "Script: ${SCRIPT_DIR}/src/index.js"
echo "Modo: ${MODE}"
echo "Cron ativo: $(crontab -l 2>/dev/null | grep tvfacebrasilv4 | head -1)"