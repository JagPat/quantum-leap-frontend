# Multi-stage build for reproducible deployments
FROM node:18-alpine AS builder

# Set build arguments
ARG COMMIT_SHA
ARG BUILD_TIME
ARG DEPS_LOCK_HASH
ARG NODE_VERSION

# Set environment variables
ENV VITE_COMMIT_SHA=$COMMIT_SHA
ENV VITE_BUILD_TIME=$BUILD_TIME
ENV VITE_NODE_VERSION=$NODE_VERSION
ENV VITE_PACKAGE_LOCK_HASH=$DEPS_LOCK_HASH
ENV VITE_BUILD_ID=${COMMIT_SHA:0:8}-$(date +%Y%m%d%H%M%S)

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Add version endpoint
RUN echo '{"commitSha":"'$COMMIT_SHA'","buildTime":"'$BUILD_TIME'","imageDigest":"'$(docker images --no-trunc -q nginx:alpine)'"}' > /usr/share/nginx/html/version.json

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
