FROM oven/bun:latest

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src ./src
COPY test ./test
COPY tsconfig.json .

# Environment variables with defaults
ENV TCP_PORT=6969
ENV TCP_HOSTNAME=0.0.0.0
ENV HTTP_PORT=8080
ENV HTTP_HOSTNAME=0.0.0.0
ENV UPDATE_FREQUENCY=60
ENV DEBUG_PROTOCOL=0

# Expose ports
EXPOSE 6969 8080

# Run the application
CMD ["bun", "run", "src/main.ts"]
