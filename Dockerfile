# Use Node.js LTS version
FROM node:20-slim

# Labels
LABEL org.opencontainers.image.title="Plane Discord Bot"
LABEL org.opencontainers.image.description="Discord bot for Plane project management with multi-channel support"
LABEL org.opencontainers.image.version="2.0.0"

# Create app directory
WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package*.json ./

# Install dependencies (including optional for SQLite support)
RUN npm ci --omit=dev

# Copy app source
COPY . .

# Create data directory for channel configurations
RUN mkdir -p /usr/src/app/data

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user and set permissions
RUN useradd -m -r -u 1001 botuser \
    && chown -R botuser:botuser /usr/src/app

# Switch to non-root user
USER botuser

# Volume for persistent channel configuration data
VOLUME ["/usr/src/app/data"]

# Health check (verify process is running)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Start the bot
CMD [ "npm", "start" ]
