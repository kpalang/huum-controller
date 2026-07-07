# Project Guidelines

## Code Style

- TypeScript with ambient global types in `.d.ts` files
- Use Uint8Array for binary buffers
- Event names follow 'huum-*' and 'user-*' patterns
- Environment variables for configuration (TCP_HOSTNAME, HTTP_HOSTNAME, etc.)

## Architecture

This is an event-driven system mimicking the Huum cloud server for local sauna control:

- **TCP Server** ([src/tcp/tcp-server.ts](src/tcp/tcp-server.ts)): Handles raw TCP connections on port 6969, parses binary messages from hardware
- **HTTP Server** ([src/http/http-server.ts](src/http/http-server.ts)): Provides REST API on port 8080 for user control
- **EventBus** ([src/events/eventbus.ts](src/events/eventbus.ts)): Decouples components using Node.js EventEmitter
- **Message Builder** ([src/tcp/msgBuilder.ts](src/tcp/msgBuilder.ts)): Generates binary payloads for commands
- **Protocol Logger** ([src/util/logger.ts](src/util/logger.ts)): Logs all incoming/outgoing TCP messages for reverse engineering (enabled via `DEBUG_PROTOCOL=1` env var)

See [README.md](README.md) for protocol details and message formats.

## Build and Test

### Local
- Install: `bun install`
- Run: `bun run start` (starts both servers)
- Run with debug logging: `DEBUG_PROTOCOL=1 bun run start`
- Test: `bun test` (runs tests in test/ directory)

Requires Bun 1.12.4+

### Docker
- Build: `docker build -t huum-controller .`
- Run: `docker run -p 6969:6969 -p 8080:8080 huum-controller`
- Run with debug logging: `docker run -p 6969:6969 -p 8080:8080 -e DEBUG_PROTOCOL=1 huum-controller`
- Compose: `docker-compose up --build` (includes test support)
- Test in container: `docker run --rm huum-controller:test bun test`

## Debugging & Reverse Engineering

Enable protocol logging to capture all TCP messages:
```bash
# Local
DEBUG_PROTOCOL=1 bun run start

# Docker
docker run -p 6969:6969 -p 8080:8080 -e DEBUG_PROTOCOL=1 huum-controller

# Docker Compose - edit docker-compose.yml to set DEBUG_PROTOCOL: 1
docker-compose up
```

Logger output format: `[direction timestamp] Message ID: 0xHEX | Length: N | Hex: PAYLOAD`

## Conventions

- Binary messages start with message ID byte (0x02, 0x07, 0x08, 0x09, 0x0B)
- Timestamps encoded as little-endian Unix seconds
- Temperature as single byte (0-255°C)
- Heater status: 0x23=Offline, 0x24=Heating, 0x25=Online

Reference [README.md](README.md#L62-L115) for exact payload structures. Avoid modifying unknown fields.