# Guards, Interceptors & Middlewares Guide

This document details the request-response lifecycle in EventHub, specifically explaining the authentication/roles guards, response interceptor, and middlewares.

---

## 1. Request Lifecycle Overview

```
Incoming Request
      │
      ▼
[RequestIdMiddleware]    --> Injects X-Request-Id header (UUID)
      │
      ▼
[HttpLoggerMiddleware]   --> Logs Method, URL, IP, Timestamp
      │
      ▼
[ThrottlerGuard]         --> Applies Rate Limiting (especially Auth/OTP)
      │
      ▼
[JwtAuthGuard]           --> Verifies Bearer JWT Access Token
      │
      ▼
[RolesGuard]             --> Checks @Roles('ADMIN', 'USER') metadata
      │
      ▼
[ValidationPipe]         --> Whitelists & transforms DTO inputs
      │
      ▼
[Controller Handler]     --> Dispatches to Service logic
      │
      ▼
[ResponseInterceptor]   --> Standardizes response payload format
      │
      ▼
[LoggingInterceptor]    --> Logs execution time (ms)
      │
      ▼
Client Response
```

---

## 2. Guards Specification

### `JwtAuthGuard`
- **Location:** `backend/src/common/guards/jwt-auth.guard.ts`
- **Purpose:** Protects endpoints from unauthenticated access.
- **Behavior:**
  - Extracts Bearer token from `Authorization` header.
  - Validates token signature with `JWT_SECRET`.
  - Injects authenticated user `{ id, email, role }` into `req.user`.
  - Returns `401 Unauthorized` if token is absent, malformed, or expired.

### `RolesGuard`
- **Location:** `backend/src/common/guards/roles.guard.ts`
- **Decorator:** `@Roles(...roles: Role[])`
- **Behavior:**
  - Reads required roles using NestJS `Reflector`.
  - If no roles required, allows request.
  - If roles required, compares `req.user.role` with allowed roles.
  - Returns `403 Forbidden` (`Insufficient permissions`) if role check fails.

---

## 3. Interceptors Specification

### Common Response Interceptor (`ResponseInterceptor`)
- **Location:** `backend/src/common/interceptors/response.interceptor.ts`
- **Purpose:** Enforces an invariant JSON envelope across all successful endpoints.
- **Envelope Structure:**
```json
{
  "statusCode": 200,
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "timestamp": "2026-10-08T13:00:00.000Z"
}
```

### `LoggingInterceptor`
- **Location:** `backend/src/common/interceptors/logging.interceptor.ts`
- **Behavior:** Calculates processing duration (`Date.now() - now`) and logs controller execution.

---

## 4. Middlewares Specification

### `RequestIdMiddleware`
- **Location:** `backend/src/common/middlewares/request-id.middleware.ts`
- **Behavior:** Ensures every request has a correlation ID for distributed tracing across logs and RabbitMQ messages.

### `HttpLoggerMiddleware`
- **Location:** `backend/src/common/middlewares/http-logger.middleware.ts`
- **Behavior:** Prints structured access logs: `[HTTP] POST /api/auth/login - 200 OK - 24ms`.
