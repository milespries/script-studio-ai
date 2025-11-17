# Stage 1: build the TypeScript backend
FROM node:18-alpine AS build

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build TypeScript to dist/
RUN npm run build

# Stage 2: run the built app
FROM node:18-alpine

WORKDIR /app

# Copy only runtime files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/dist ./dist

# Install only production dependencies
RUN npm install --only=production

# Environment
ENV NODE_ENV=production
# Cloud Run will inject PORT, fallback for local
ENV PORT=8080

# Expose the port the app listens on
EXPOSE 8080

# Start the app
CMD ["node", "dist/index.js"]