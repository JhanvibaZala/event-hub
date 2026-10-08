---
name: nestjs-api
description: Architectural standards and guidelines for building NestJS REST APIs, covering controller-service boundaries, DTO validation pipes, JWT & Roles guards, unified response & logging interceptors, middlewares, and Swagger documentation.
---

# NestJS API Architecture & Engineering Standards

This skill defines the technical standards for constructing maintainable, resilient, and standardized NestJS REST APIs for the EventHub system.

---

## 1. Architectural Layers & Separation of Concerns

1. **Controllers:**
   - Controllers must strictly handle HTTP route mapping, parameter extraction (`@Param()`, `@Query()`, `@Body()`, `@Req()`), applying guards (`@UseGuards(JwtAuthGuard, RolesGuard)`), applying decorators (`@Roles('ADMIN')`), and Swagger annotations.
   - Prohibit business logic, raw database queries, or external network calls directly in controllers.
2. **Services:**
   - Encapsulate all business rules, model transactions, and external services.
   - Inject Sequelize models or custom repositories using `@InjectModel()`.
   - Throw semantic NestJS HTTP exceptions (`NotFoundException`, `ConflictException`, `BadRequestException`, `ForbiddenException`).
3. **DTOs & Validation:**
   - Define strongly typed DTO classes with `class-validator` and `class-transformer` decorators.
   - Enforce global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.

---

## 2. Guards: Authentication & Authorization

### A. Authentication Guard (`JwtAuthGuard`)
- Protect private endpoints using Passport JWT strategy (`@UseGuards(JwtAuthGuard)`).
- Validates the single `Bearer <accessToken>` header.
- Injects decoded payload (`{ id: string, email: string, role: string }`) into `req.user`.

### B. Roles Guard (`RolesGuard`)
- Custom guard reading metadata via `Reflector` set by `@Roles('ADMIN', 'USER')`.
- Compares user's role against route allowed roles.
- Returns `ForbiddenException('Insufficient permissions')` when unauthorized.

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Delete(':id')
async deleteEvent(@Param('id') id: string) { ... }
```

---

## 3. Interceptors: Unified Response & Logging

### A. Common Response Interceptor (`ResponseInterceptor`)
All successful HTTP responses must be automatically transformed into a standardized JSON envelope:
```typescript
{
  "statusCode": 200,
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "timestamp": "2026-10-08T13:00:00.000Z"
}
```

### B. Logging Interceptor (`LoggingInterceptor`)
- Intercepts requests and responses to log execution duration, route, method, status code, and IP.

---

## 4. Middlewares: Request Lifecycle & Tracing

Apply middlewares globally in `AppModule.configure(consumer: MiddlewareConsumer)`:
1. **Correlation / Request ID Middleware (`RequestIdMiddleware`):**
   - Attaches or generates a unique `X-Request-Id` (UUID) to every incoming request and echoes it in response headers.
2. **HTTP Logger Middleware (`HttpLoggerMiddleware`):**
   - Streams incoming request metadata (Method, Path, IP, User-Agent) before controller dispatch.
3. **Security Headers Middleware:**
   - Applies `helmet()` to set secure HTTP headers.

---

## 5. Global Exception Handling

Global `HttpExceptionFilter` formats all unhandled errors and HTTP exceptions into a matching response schema:
```typescript
{
  "statusCode": 404,
  "success": false,
  "message": "Event with id 123 not found",
  "error": "Not Found",
  "timestamp": "2026-10-08T13:00:00.000Z",
  "path": "/api/events/123"
}
```
