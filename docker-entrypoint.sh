#!/bin/sh
set -e

# Railway sets PORT env var - default to 80 if not set
PORT=${PORT:-80}

# Extract commit SHA from version.json if it exists
if [ -f /usr/share/nginx/html/version.json ]; then
  COMMIT_SHA=$(cat /usr/share/nginx/html/version.json | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
  BUILD_TIME=$(cat /usr/share/nginx/html/version.json | grep -o '"buildTime":"[^"]*"' | cut -d'"' -f4)
  echo "🚀 Frontend started on port $PORT (commit=${COMMIT_SHA:-unknown})"
  echo "📝 Build time: ${BUILD_TIME:-unknown}"
else
  echo "🚀 Frontend started on port $PORT (commit=unknown - version.json not found)"
fi

# Replace PORT placeholder in nginx config with actual port
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Start nginx
exec nginx -g 'daemon off;'
