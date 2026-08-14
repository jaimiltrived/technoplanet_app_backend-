# Multi-stage Dockerfile for RKU Technoplanet Backend API
FROM node:20-alpine AS base

# Install openssl for Prisma compatibility on Alpine
RUN apk add --no-cache openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for prisma generate)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY src ./src

# Expose API Port
EXPOSE 5000

# Set environment to production
ENV NODE_ENV=production

# Start application server
CMD ["node", "src/server.js"]
