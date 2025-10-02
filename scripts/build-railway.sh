#!/bin/bash

# Railway-compatible build script
set -e

echo "🔍 Starting Railway-compatible build..."

# Get build info
COMMIT_SHA=${1:-$(git rev-parse HEAD)}
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DEPS_LOCK_HASH=$(md5sum package-lock.json | cut -d' ' -f1)
NODE_VERSION=$(node --version)

echo "📋 Build Info:"
echo "  Commit SHA: $COMMIT_SHA"
echo "  Build Time: $BUILD_TIME"
echo "  Deps Hash: $DEPS_LOCK_HASH"
echo "  Node Version: $NODE_VERSION"

# Create build info file
cat > build-info.json << EOL
{
  "commitSha": "$COMMIT_SHA",
  "buildTime": "$BUILD_TIME",
  "nodeVersion": "$NODE_VERSION",
  "packageLockHash": "$DEPS_LOCK_HASH",
  "buildId": "$(date +%Y%m%d%H%M%S)"
}
EOL

echo "✅ Railway-compatible build info created"
echo "📋 Build info saved to build-info.json"
