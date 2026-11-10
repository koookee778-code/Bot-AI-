# Production Dockerfile for TEXORA Autonomous Bot on Railway
FROM node:22-slim

# Install system dependencies, FFmpeg, fonts, and Google Chrome Stable
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    ffmpeg \
    fonts-kacst \
    fonts-freefont-ttf \
    fonts-liberation \
    procps \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && rm -rf /var/lib/apt/lists/*

# Configure environment for Puppeteer to use Google Chrome Stable
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
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
