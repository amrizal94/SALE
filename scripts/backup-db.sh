#!/bin/bash
# Backup PostgreSQL — jalankan via cron: 0 2 * * * /opt/sale/scripts/backup-db.sh
set -e

BACKUP_DIR="/opt/sale/backups"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="sale_db_${DATE}.sql.gz"

mkdir -p "$BACKUP_DIR"

docker compose -f /opt/sale/docker-compose.prod.yml exec -T postgres \
  pg_dump -U sale_user sale_db | gzip > "$BACKUP_DIR/$FILENAME"

echo "Backup saved: $BACKUP_DIR/$FILENAME"

# Hapus backup lebih dari 14 hari
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +14 -delete
echo "Old backups cleaned."
