#!/bin/bash

# Rock solid build script with digest tracking
set -e

echo "🔍 Starting rock solid build process..."

# Get build arguments
COMMIT_SHA=${1:-$(git rev-parse HEAD)}
BUILD_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
DEPS_LOCK_HASH=$(md5sum package-lock.json | cut -d' ' -f1)
NODE_VERSION=$(node --version)

echo "📋 Build Info:"
echo "  Commit SHA: $COMMIT_SHA"
echo "  Build Time: $BUILD_TIME"
echo "  Deps Hash: $DEPS_LOCK_HASH"
echo "  Node Version: $NODE_VERSION"

# Build Docker image
echo "🏗️ Building Docker image..."
docker build \
  --build-arg COMMIT_SHA="$COMMIT_SHA" \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  --build-arg DEPS_LOCK_HASH="$DEPS_LOCK_HASH" \
  --build-arg NODE_VERSION="$NODE_VERSION" \
  --build-arg IMAGE_DIGEST="pending" \
  -f Dockerfile.rocksolid \
  -t quantum-leap-frontend:rocksolid \
  .

# Get image digest
IMAGE_DIGEST=$(docker images --no-trunc quantum-leap-frontend:rocksolid | tail -1 | awk '{print $3}')
echo "📦 Image Digest: $IMAGE_DIGEST"

# Rebuild with actual digest
echo "🔄 Rebuilding with actual digest..."
docker build \
  --build-arg COMMIT_SHA="$COMMIT_SHA" \
  --build-arg BUILD_TIME="$BUILD_TIME" \
  --build-arg DEPS_LOCK_HASH="$DEPS_LOCK_HASH" \
  --build-arg NODE_VERSION="$NODE_VERSION" \
  --build-arg IMAGE_DIGEST="$IMAGE_DIGEST" \
  -f Dockerfile.rocksolid \
  -t quantum-leap-frontend:rocksolid \
  .

# Create build info file
cat > build-info.json << EOL
{
  "commitSha": "$COMMIT_SHA",
  "buildTime": "$BUILD_TIME",
  "nodeVersion": "$NODE_VERSION",
  "packageLockHash": "$DEPS_LOCK_HASH",
  "imageDigest": "$IMAGE_DIGEST",
  "buildId": "${COMMIT_SHA:0:8}-$(date +%Y%m%d%H%M%S)"
}
EOL

echo "✅ Rock solid build completed!"
echo "📋 Build info saved to build-info.json"
echo "🐳 Image tagged as quantum-leap-frontend:rocksolid"
