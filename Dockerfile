# Railway-compatible Dockerfile for Vite/React static build
# Supports dynamic PORT binding and version tracking

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build arguments for commit tracking (injected by Railway or CI/CD)
ARG COMMIT_SHA=unknown
ARG BUILD_TIME
ARG GITHUB_SHA
ENV VITE_COMMIT_SHA=${COMMIT_SHA}
ENV VITE_BUILD_TIME=${BUILD_TIME}
ENV VITE_GITHUB_SHA=${GITHUB_SHA}

# Build the application
RUN npm run build

# Create version.json with comprehensive build info
RUN echo "{\"service\":\"quantum-leap-frontend\",\"commit\":\"${COMMIT_SHA}\",\"githubSha\":\"${GITHUB_SHA}\",\"buildTime\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"nodeVersion\":\"$(node --version)\",\"npmVersion\":\"$(npm --version)\",\"status\":\"ROCK_SOLID_CERTIFIED\"}" > dist/version.json

# Production stage
FROM nginx:alpine AS production

# Install gettext for envsubst
RUN apk add --no-cache gettext

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx template and startup script
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Make startup script executable
RUN chmod +x /docker-entrypoint.sh

# Create nginx log symlinks to stdout/stderr for Railway
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
    && ln -sf /dev/stderr /var/log/nginx/error.log

# Railway will set PORT env var
ENV PORT=80

# Use our custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
