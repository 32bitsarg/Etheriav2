#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/etheria/app"

case "${1:-}" in
  status)
    systemctl --no-pager status etheria-api etheria-worker etheria-web caddy
    ;;
  logs-api)
    journalctl -u etheria-api -n "${2:-200}" --no-pager
    ;;
  logs-web)
    journalctl -u etheria-web -n "${2:-200}" --no-pager
    ;;
  logs-caddy)
    journalctl -u caddy -n "${2:-200}" --no-pager
    ;;
  logs-worker)
    journalctl -u etheria-worker -n "${2:-200}" --no-pager
    ;;
  restart-api)
    systemctl restart etheria-api
    ;;
  restart-web)
    systemctl restart etheria-web
    ;;
  restart-worker)
    systemctl restart etheria-worker
    ;;
  rebuild-api)
    sudo -u etheria bash -lc "cd ${APP_DIR} && set -a && source /opt/etheria/api.env && set +a && pnpm --filter @etheria/api build"
    ;;
  rebuild-web)
    sudo -u etheria bash -lc "cd ${APP_DIR} && set -a && source /opt/etheria/web.env && set +a && pnpm --filter @etheria/web build"
    ;;
  deploy)
    sudo -u etheria /opt/etheria/deploy.sh
    ;;
  *)
    echo "Invalid action" >&2
    exit 64
    ;;
esac
