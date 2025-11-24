# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1 AS builder

# Set working directory
WORKDIR /app

# Copy workspace and TypeScript configuration
COPY bunfig.toml bun.lock package.json tsconfig.json tsconfig.base.json ./

# Copy all workspace packages (handles any new packages automatically)
COPY packages ./packages
COPY oss ./oss
COPY apps/app ./apps/app

# Install all dependencies (including dev dependencies for build)
# Disable husky in Docker builds and use production mode
ENV HUSKY=0
RUN bun install --frozen-lockfile --ignore-scripts

# Build only the client-side assets (Bun can run TypeScript natively)
RUN cd apps/app && bun run esbuild src/client/js/app.ts --bundle --outdir=src/public/js --format=esm --sourcemap

# Production stage
FROM oven/bun:1 AS production

# Set working directory
WORKDIR /app

# Copy workspace and TypeScript configuration
COPY bunfig.toml bun.lock package.json tsconfig.json tsconfig.base.json ./

# Copy all packages with their source code (handles any new packages automatically)
COPY packages ./packages
COPY oss ./oss
COPY apps/app/package.json apps/app/tsconfig.json ./apps/app/

# Install only production dependencies (no dev dependencies needed in production)
# Disable husky in Docker builds
ENV HUSKY=0
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy built client assets and all source files from builder stage
COPY --from=builder /app/apps/app/src ./apps/app/src

# Set working directory to root
WORKDIR /app

# Expose port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Start the application using bun (Bun can run TypeScript natively, no tsx needed)
WORKDIR /app/apps/app
CMD ["bun", "src/index.ts"]
