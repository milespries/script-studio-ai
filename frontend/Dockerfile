# Stage 1: Build the Vite app
FROM node:18-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

# Build-time API base URL
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

# Copy source code
COPY . .

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Copy build output
COPY --from=build /app/dist /usr/share/nginx/html

# Expose nginx port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]