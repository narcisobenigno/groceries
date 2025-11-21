# syntax=docker/dockerfile:1

# Build stage
FROM node:22-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace and TypeScript configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json tsconfig.base.json ./

# Copy all workspace packages (handles any new packages automatically)
COPY packages ./packages
COPY oss ./oss
COPY apps/app ./apps/app

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Build only the client-side assets (we'll run TypeScript directly with tsx)
RUN cd apps/app && pnpm exec esbuild src/client/js/app.ts --bundle --outdir=src/public/js --format=esm --sourcemap

# Production stage
FROM node:22-slim AS production

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.8.0 --activate

# Set working directory
WORKDIR /app

# Copy workspace and TypeScript configuration
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.json tsconfig.base.json ./

# Copy all packages with their source code (handles any new packages automatically)
COPY packages ./packages
COPY oss ./oss
COPY apps/app/package.json apps/app/tsconfig.json ./apps/app/

# Install all dependencies (need tsx to run TypeScript in production)
# Don't use --ignore-scripts because we need tsx binary to be available
RUN pnpm install --frozen-lockfile

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

# Start the application using node with tsx loader
WORKDIR /app/apps/app
CMD ["node", "--import", "tsx", "src/index.ts"]
