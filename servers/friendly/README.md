# Niney Life Pickr Friendly Server

Node.js backend service for Niney Life Pickr application.

## Setup

```bash
cd servers/friendly
npm install
cp .env.example .env
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix
```

## Production

```bash
# Build TypeScript
npm run build

# Start production server
npm run start:prod
```

## API Endpoints

### Health Check
- `GET /` - Server info
- `GET /health` - Detailed health status
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe

### API
- `GET /api/version` - API version info
- `GET /api/choices` - Choice categories (placeholder)
- `GET /api/recommendations` - Recommendations (placeholder)

## Project Structure

```
servers/friendly/
├── src/
│   ├── app.ts           # Express app setup
│   ├── server.ts        # Server entry point
│   ├── routes/          # Route definitions
│   ├── controllers/     # Request handlers
│   ├── services/        # Business logic
│   ├── middlewares/     # Custom middleware
│   ├── utils/           # Utility functions
│   └── types/           # TypeScript type definitions
├── dist/                # Compiled JavaScript (generated)
├── tsconfig.json        # TypeScript configuration
├── nodemon.json         # Nodemon configuration
└── package.json         # Project dependencies
```

## Configuration

The server loads configuration from:
1. `config/base.yml` - Shared configuration
2. Environment variables - Override config values
3. `.env` file - Local environment variables

Default port: 4000

## Technologies

- Node.js
- Express 5.x
- TypeScript 5.x
- Helmet (Security)
- CORS
- Morgan (Logging)
- Compression