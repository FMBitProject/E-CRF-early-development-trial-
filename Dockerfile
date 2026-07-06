# E-CRF System — production container (on-premise / self-hosted licensing).
# Single Node service that serves both the API and the static frontend.
# Postgres is provided separately (see docker-compose.yml).

FROM node:20-alpine AS base
WORKDIR /app

# Install ONLY production dependencies first (own layer → cached across code changes).
# package-lock.json is required by `npm ci` for reproducible installs.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the application source (node_modules/.env excluded via .dockerignore).
COPY . .

# Run as a non-root user (defence in depth).
RUN addgroup -S ecrf && adduser -S ecrf -G ecrf && chown -R ecrf:ecrf /app
USER ecrf

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Liveness probe against the built-in health endpoint (Node 20 has global fetch).
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# Migrations run automatically on boot (server.js runMigrations()).
CMD ["npm", "start"]
