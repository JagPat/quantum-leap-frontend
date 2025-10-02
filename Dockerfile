# Simple Railway-compatible Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Add version endpoint
RUN echo '{"service":"quantum-leap-frontend","commit":"unknown","buildTime":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","status":"ROCK_SOLID_CERTIFIED"}' > /usr/share/nginx/html/version.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
