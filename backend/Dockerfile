# Backend Dockerfile for PillPulse
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create directories for data and logs
RUN mkdir -p /app/data /app/logs /app/backups

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S pillpulse -u 1001

# Change ownership of the app directory
RUN chown -R pillpulse:nodejs /app
USER pillpulse

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
CMD ["npm", "start"]