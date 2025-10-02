#!/bin/sh
set -e

# Railway sets PORT env var - default to 80 if not set
PORT=${PORT:-80}

echo "🚀 Starting nginx on port $PORT..."

# Replace PORT placeholder in nginx config with actual port
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;'
