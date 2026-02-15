# Use official lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app/frontend

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json* ./

# Install dependencies (use install to be more lenient with lockfile)
RUN npm install

# Copy the rest of the application code
# Copy the rest of the application code
COPY . .

# Build args
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the application in production mode
CMD ["npm", "start"]
