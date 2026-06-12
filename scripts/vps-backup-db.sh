#!/usr/bin/env bash
# Etheria — nightly Postgres backup
# Deployed to /opt/etheria/backup-db.sh on the VPS.
# Activate with: systemctl enable --now etheria-db-backup.timer
set -euo pipefail

ENV_FILE="/opt/etheria/api.env"
BACKUP_DIR="/opt/etheria/backups"
DAILY_DIR="$BACKUP_DIR/daily"
WEEKLY_DIR="$BACKUP_DIR/weekly"
KEEP_DAILY=7
KEEP_WEEKLY=4

# Load DATABASE_URL from env
set -a; source "$ENV_FILE"; set +a

mkdir -p "$DAILY_DIR" "$WEEKLY_DIR"
chmod 700 "$BACKUP_DIR"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$DAILY_DIR/etheria-$STAMP.dump"

echo "[backup] Starting pg_dump → $OUT"
pg_dump --no-owner --format=custom --compress=6 --file="$OUT.tmp" "$DATABASE_URL"
mv "$OUT.tmp" "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
echo "[backup] OK $OUT ($SIZE)"

# Weekly snapshot on Sundays (day 7)
if [ "$(date +%u)" = "7" ]; then
  cp "$OUT" "$WEEKLY_DIR/"
  echo "[backup] Weekly copy saved"
fi

# Rotation — keep newest N, delete the rest
ls -1t "$DAILY_DIR"/etheria-*.dump 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | xargs -r rm --
ls -1t "$WEEKLY_DIR"/etheria-*.dump 2>/dev/null | tail -n +$((KEEP_WEEKLY + 1)) | xargs -r rm --

echo "[backup] Done. Daily kept: $(ls "$DAILY_DIR"/*.dump 2>/dev/null | wc -l), Weekly: $(ls "$WEEKLY_DIR"/*.dump 2>/dev/null | wc -l)"
