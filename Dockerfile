# --- Build stage ---
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies against the lockfile for reproducible builds.
COPY package*.json ./
RUN npm ci

# Build the client (Vite) and bundle the server (esbuild) into dist/.
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/echolytix.db

RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/data && chown -R app:app /app

# Only production dependencies are needed to run the bundled server.
COPY package*.json ./
RUN npm ci --omit=dev

# Bundled client + server (Vite copies public/ assets into dist/).
COPY --from=build /app/dist ./dist

RUN chown -R app:app /app
USER app

VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
