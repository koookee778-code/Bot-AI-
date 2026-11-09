# Production Dockerfile for TEXORA Autonomous Bot on Vercel Daemons
FROM node:22-slim

# Install system dependencies: Chromium, FFmpeg, and Arabic / multilingual fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-liberation \
    ca-certificates \
    procps \
    && rm -rf /var/lib/apt/lists/*

# Configure environment for Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    PORT=3001

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose server port
EXPOSE 3001

# Run the Bot server
CMD ["npx", "tsx", "server.ts"]
