#!/bin/sh
set -e

mkdir -p /app/data /app/uploads/receipts

if [ "$(id -u)" = "0" ]; then
  chown -R node:node /app/data /app/uploads
  exec gosu node "$0" "$@"
fi

echo ">>> [INFO] Initializing database schema..."
node setup-db.js

echo ">>> [INFO] Starting application..."
exec "$@"
