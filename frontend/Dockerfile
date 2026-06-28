# --- Base Stage ---
FROM node:18-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Development Stage ---
FROM base AS development
RUN npm install
# Expose Vite default port and run dev server
EXPOSE 3000
CMD ["npm", "run", "dev"]

# --- Production Build Stage ---
FROM base AS builder
# Use npm ci for reproducible builds
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:5000
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# Stage 2: Serve the built application with Nginx
FROM nginx:stable-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Nginx will listen on port 80 by default
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
