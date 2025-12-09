FROM node:20-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git openssh-client github-cli

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build Next.js
RUN npm run build

# Expose port (for web)
EXPOSE 3000

# Ensure data directory exists
RUN mkdir -p /app/data

# Default command
CMD ["npm", "start"]
