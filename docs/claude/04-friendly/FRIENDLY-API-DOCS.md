# FRIENDLY-API-DOCS.md

> **Last Updated**: 2025-10-23 23:40
> **Purpose**: API documentation system (Swagger, Scalar, auto-generation)

---

## Quick Reference

**Documentation Endpoints**:
- `/docs` - Swagger UI (interactive API tester)
- `/reference` - Scalar Reference (modern API docs)
- `/api/docs/spec` - OpenAPI 3.0 JSON specification
- `/api/docs/generate/:routeName` - Route-specific markdown docs
- `/api/docs/ai-prompt` - AI-friendly comprehensive prompt

---

## 1. Swagger UI

**URL**: `http://localhost:4000/docs`

**Features**:
- Interactive API testing interface
- Try endpoints with sample requests
- Schema visualization
- Bearer token authentication support

**Library**: `@fastify/swagger-ui`

---

## 2. Scalar Reference

**URL**: `http://localhost:4000/reference`

**Features**:
- Modern, sleek API reference
- Better UX than Swagger UI
- Dark mode support
- Code examples in multiple languages

**Library**: `@scalar/fastify-api-reference`

---

## 3. OpenAPI Specification

**URL**: `http://localhost:4000/api/docs/spec`

**Format**: OpenAPI 3.0 JSON

**Usage**:
- Import to Postman, Insomnia, Thunder Client
- Generate client SDKs
- API contract validation

**Auto-Generated**: From TypeBox schemas and route definitions

---

## 4. Route-Specific Documentation

**Endpoint**: `POST /api/docs/generate/:routeName`

**Supported Routes**:
- `auth` - Authentication endpoints
- `health` - Health check
- `crawler` - Crawling endpoints
- `restaurant` - Restaurant CRUD
- `review` - Review management

**Output**: Markdown documentation with:
- Endpoint descriptions
- Request/response schemas
- Example requests (curl)
- Error responses

**Example**:
```bash
curl -X POST http://localhost:4000/api/docs/generate/auth > AUTH_API.md
```

---

## 5. AI-Friendly Prompt

**Endpoint**: `GET /api/docs/ai-prompt`

**Purpose**: Comprehensive API documentation in a single prompt format for AI assistants

**Content**:
- All endpoints with full descriptions
- Complete request/response schemas
- Authentication details
- Error handling patterns

**Usage**: Copy prompt to AI assistant context when working with the API

---

## 6. Documentation Generation

**Technology**: `@fastify/swagger` with TypeBox schemas

**Process**:
1. Routes define TypeBox request/response schemas
2. Fastify automatically generates OpenAPI spec
3. Swagger UI and Scalar render spec as interactive docs
4. Custom generator creates markdown from spec

**Example Schema**:
```typescript
{
  schema: {
    tags: ['auth'],
    summary: 'Login with credentials',
    body: Type.Object({
      email: Type.String({ format: 'email' }),
      password: Type.String({ minLength: 6 })
    }),
    response: {
      200: Type.Object({
        result: Type.Boolean(),
        message: Type.String(),
        data: Type.Object({
          user: UserSchema
        })
      })
    }
  }
}
```

---

**See Also**:
- [FRIENDLY-OVERVIEW.md](./FRIENDLY-OVERVIEW.md) - API documentation system overview
- [FRIENDLY-ROUTES.md](./FRIENDLY-ROUTES.md) - All route definitions
