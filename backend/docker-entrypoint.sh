#!/bin/sh
set -e

mkdir -p /app/data /app/uploads/receipts

echo ">>> [INFO] Initializing database schema..."
node setup-db.js

echo ">>> [INFO] Starting application..."
exec "$@"
