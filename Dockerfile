# Rock Solid Railway-compatible Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including dev dependencies for build)
RUN npm ci --frozen-lockfile

# Copy source code
COPY . .

# Create build info (simplified for Railway compatibility)
RUN echo '{"commitSha":"unknown","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","nodeVersion":"'$(node --version)'","packageLockHash":"unknown","buildId":"'$(date +%Y%m%d%H%M%S)'"}' > build-info.json

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build-info.json /usr/share/nginx/html/build-info.json

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Add version endpoint (simplified for Railway)
RUN echo '{"service":"quantum-leap-frontend","commit":"unknown","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","status":"ROCK_SOLID_CERTIFIED"}' > /usr/share/nginx/html/version.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
