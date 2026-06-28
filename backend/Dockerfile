# Use an official Node.js runtime as a parent image
FROM node:18-alpine AS base

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# --- Development Stage ---
FROM base AS development
# Install all dependencies, including devDependencies like nodemon
RUN npm install
# Default command for development
CMD ["npm", "run", "dev"]

# --- Production Stage ---
FROM base AS production
# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application source code
COPY . .

# Create a non-root user to run the application
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Your app is running on port 5000
EXPOSE 5000

# Command to run your app
CMD [ "npm", "start" ]
