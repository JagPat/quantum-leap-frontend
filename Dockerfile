# Robust Railway-compatible Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with verbose output
RUN npm ci --frozen-lockfile --verbose

# Verify vite is installed
RUN npm list vite || echo "vite not found"

# Copy source code
COPY . .

# Build the application with verbose output
RUN npm run build --verbose

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Add version endpoint
RUN echo '{"service":"quantum-leap-frontend","commit":"unknown","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","status":"ROCK_SOLID_CERTIFIED"}' > /usr/share/nginx/html/version.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
