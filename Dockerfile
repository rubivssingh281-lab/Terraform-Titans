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

# Only production dependencies are needed to run the bundled server.
COPY package*.json ./
RUN npm ci --omit=dev

# Bundled client + server (Vite copies public/ assets into dist/).
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
