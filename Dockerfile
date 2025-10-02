# Railway-compatible Dockerfile for Quantum Leap Frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --frozen-lockfile

# Copy source code
COPY . .

# Create build info
RUN echo '{
  "commitSha": "'${COMMIT_SHA:-unknown}'",
  "buildTime": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
  "nodeVersion": "'$(node --version)'",
  "packageLockHash": "'$(md5sum package-lock.json | cut -d" " -f1)'",
  "buildId": "'$(date +%Y%m%d%H%M%S)'"
}' > build-info.json

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/build-info.json /usr/share/nginx/html/build-info.json

# Add version endpoint
RUN echo '{"service":"quantum-leap-frontend","commit":"'${COMMIT_SHA:-unknown}'","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","status":"ROCK_SOLID_CERTIFIED"}' > /usr/share/nginx/html/version.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
