# Use an official Node.js runtime as a parent image
FROM node:20 as BUILD

# Set the working directory in the container
WORKDIR /app

# Copy the package.json and package-lock.json files
COPY package*.json ./

# Install the necessary dependencies
RUN npm install --production

# Copy the remaining application code
COPY . .

FROM node:20-slim

WORKDIR /app

COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app /app

# Expose port 3003 for the admin interface
EXPOSE 3003

# Run the application
CMD ["node", "index.js"]
