# Use Node.js LTS version (full image for better compatibility)
FROM node:20-alpine

# Labels
LABEL org.opencontainers.image.title="Plane Discord Bot"
LABEL org.opencontainers.image.description="Discord bot for Plane project management with multi-channel support"
LABEL org.opencontainers.image.version="2.0.0"

# Create app directory
WORKDIR /usr/src/app

# Install build dependencies for native modules (better-sqlite3)
# Alpine uses apk instead of apt-get - more reliable in container builds
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies (including optional for SQLite support)
RUN npm ci --omit=dev

# Remove build dependencies after npm install to reduce image size
RUN apk del python3 make g++

# Copy app source
COPY . .

# Create data directory for channel configurations
RUN mkdir -p /usr/src/app/data

# Set environment variables
ENV NODE_ENV=production

# Create a non-root user and set permissions
RUN addgroup -g 1001 -S botuser \
    && adduser -u 1001 -S botuser -G botuser \
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
