# Build Stage
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy all project files
COPY . .

# Build the app
RUN npm run build

# Production Stage
FROM nginx:stable-alpine AS production-stage

# Copy the build output from build-stage to nginx public directory
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
