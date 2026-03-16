# Multi-service Production Stage
FROM node:20-slim AS production

# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files from local root and mcp-server
COPY package*.json ./
COPY mcp-server/package*.json ./mcp-server/

# Install dependencies (including production deps for both)
RUN npm install --omit=dev
RUN cd mcp-server && npm install --omit=dev

# Copy project files
COPY . .

# Build the Frontend
RUN npm run build

# Expose ports: 
# 5173 for Frontend (internal/external)
# 3000 for MCP Server (SSE)
EXPOSE 5173 3000

# Environment variables
ENV NODE_ENV=production
ENV IQS_BASE_URL=http://localhost:5173
ENV PORT=3000

# Entrypoint script to start both services
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
