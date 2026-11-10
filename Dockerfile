# Production Dockerfile for TEXORA Autonomous Bot on Vercel Daemons
FROM node:22-slim

# Install system dependencies: Chromium, FFmpeg, fonts, and required native libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-liberation \
    ca-certificates \
    procps \
    libasound2 \
    libgbm1 \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

# Configure environment for Puppeteer to use the installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=256" \
    PORT=3001

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source code
COPY . .

# Build frontend dashboard
RUN npm run build

# Expose server port
EXPOSE 3001

# Run the Bot server with constrained V8 memory limit
CMD ["node", "--max-old-space-size=256", "./node_modules/.bin/tsx", "server.ts"]
