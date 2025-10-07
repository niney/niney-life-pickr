# Niney Life Pickr Friendly Server

Node.js backend service for Niney Life Pickr application.

## Setup

```bash
cd servers/friendly
npm install
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

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration
```

### Test Structure
- **Unit Tests**: `src/__tests__/unit/` - Test individual functions and modules
- **Integration Tests**: `src/__tests__/integration/` - Test API endpoints with Supertest
- **Test Setup**: `src/__tests__/setup.ts` - Global test configuration
- **Coverage Threshold**: 80% for branches, functions, lines, and statements

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

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/users` - Get all users (test only)

### Restaurants
- `GET /api/restaurants` - Get restaurant list (pagination)
- `GET /api/restaurants/categories` - Get restaurant categories
- `GET /api/restaurants/:id` - Get restaurant detail with menus
- `GET /api/restaurants/:id/reviews` - Get restaurant reviews by ID (pagination)
- `GET /api/restaurants/place/:placeId/reviews` - Get reviews by Place ID (deprecated, use `:id/reviews`)

### Crawler
- `POST /api/crawler/restaurant` - Crawl restaurant from Naver Place URL

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
1. `config/base.yml` - Base configuration for all environments
2. `config/test.yml` - Test environment overrides (when NODE_ENV=test)
3. `config/production.yml` - Production overrides (when NODE_ENV=production)
4. Environment variables - Override any config values

Configuration priority (highest to lowest):
- Environment variables
- Environment-specific config (test.yml, production.yml)
- Base config (base.yml)
- Default values

Default port: 4000

## Technologies

- Node.js
- Express 5.x
- TypeScript 5.x
- Helmet (Security)
- CORS
- Morgan (Logging)
- Compression
- Vitest (Testing Framework)
- Supertest (API Testing)