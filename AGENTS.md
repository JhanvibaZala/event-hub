# EventHub Engineering Guidelines & Multi-Agent Architecture

Welcome to the **EventHub** project. This file defines mandatory architectural principles, conventions, agent roles, and collaboration workflows for all autonomous agents and contributors.

---

## 1. Project Overview & Non-Negotiable Directives

1. **Framework & Language:** NestJS (Backend) + React (Frontend), both using strict TypeScript.
2. **Database & ORM:** PostgreSQL using **Sequelize** (`sequelize-typescript` decorators).
3. **Authentication:** Single **Access Token** policy (Bearer JWT). No refresh tokens.
4. **OTP System (Strictly NO Nodemailer):** Email transport/Nodemailer is disallowed. 6-digit OTPs are generated on the server (5-min TTL) and returned directly in the registration or forgot-password API response for immediate display/entry on the frontend `/verify-otp` view.
5. **Guards:**
   - `JwtAuthGuard`: Validates Bearer access tokens on authenticated routes.
   - `RolesGuard`: Evaluates `@Roles('ADMIN', 'USER')` metadata to enforce role-based access control.
6. **Interceptors:**
   - `ResponseInterceptor`: Automatically formats all successful HTTP responses into a standardized structure:
     ```json
     {
       "statusCode": 200,
       "success": true,
       "message": "Operation successful",
       "data": {},
       "timestamp": "2026-10-08T13:00:00.000Z"
     }
     ```
   - `LoggingInterceptor`: Logs request execution times, routes, and response statuses.
7. **Middlewares:**
   - `RequestIdMiddleware`: Generates/attaches a unique `X-Request-Id` (UUID) to every request.
   - `HttpLoggerMiddleware`: Logs incoming HTTP requests.
   - `Helmet`: Applied globally for secure HTTP headers.
8. **Asynchronous Messaging:** RabbitMQ for decoupled event processing (`registration.created`, `registration.cancelled`, `notification.dispatch`).

---

## 2. Directory Layout

```
eventhub/
├── backend/                  # NestJS TypeScript Application
│   ├── src/
│   │   ├── auth/             # JWT Auth, OTP Service, Passport Strategy, DTOs
│   │   ├── users/            # User model, Profile endpoints
│   │   ├── events/           # Event model, CRUD, Query, Pagination
│   │   ├── categories/       # Category model & management
│   │   ├── registrations/    # Event registrations, seat management
│   │   ├── notifications/    # In-app notifications
│   │   ├── rabbitmq/         # Producer, Consumer, Topology
│   │   ├── common/           # Guards, Interceptors, Middlewares, Filters, DTOs
│   │   └── database/         # Sequelize connection & model providers
│   └── test/                 # Supertest E2E integration tests
│
├── frontend/                 # React 18 + Redux Toolkit + Vite SPA
│   ├── src/
│   │   ├── app/              # Store, typed hooks
│   │   ├── features/         # auth, events, registrations, notifications slices & UI
│   │   ├── components/       # Common buttons, cards, modals, tables
│   │   ├── hooks/            # useDebounce, usePagination
│   │   ├── layouts/          # MainLayout, AdminLayout
│   │   ├── routes/           # AppRoutes, ProtectedRoute, AdminRoute
│   │   └── services/         # Axios instance & interceptors
│   └── ...
│
├── .agents/
│   ├── agents/               # Workspace Agent definitions
│   └── skills/               # Workspace Skills
├── docs/                     # Architectural documentation
├── docker-compose.yml        # PostgreSQL & RabbitMQ orchestration
├── AGENTS.md
└── README.md
```

---

## 3. Agents & Subagent Collaboration Flow

```
                     ┌──────────────────┐
                     │   Orchestrator   │
                     └────────┬─────────┘
                              │
       ┌──────────────┬───────┴───────┬──────────────┬──────────────┐
       │              │               │              │              │
┌──────▼─────┐ ┌──────▼─────┐  ┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐
│  database  │ │  backend   │  │  rabbitmq  │ │  frontend  │ │     qa     │
│   -agent   │ │   -agent   │  │   -agent   │ │   -agent   │ │   -agent   │
└──────┬─────┘ └──────┬─────┘  └──────┬─────┘ └──────┬─────┘ └──────┬─────┘
       │              │               │              │              │
       └──────────────┼───────────────┴──────────────┴──────────────┘
                      │
               Verification Gates
       ┌──────────────┴──────────────┐
       │                             │
┌──────▼──────┐               ┌──────▼────────┐
│ code-review │               │security-review│
└─────────────┘               └───────────────┘
```

### Delegation Rules:
1. **Database Changes:** Delegated to `database-agent`. Models must use `sequelize-typescript`, include explicit indexes, and handle transactions.
2. **Backend Endpoints:** Delegated to `backend-agent`. Must follow thin-controller pattern, attach DTOs, bind `JwtAuthGuard` / `RolesGuard`, and use `ResponseInterceptor`.
3. **Messaging & Jobs:** Delegated to `rabbitmq-agent`. Handlers must be idempotent and support dead-lettering.
4. **UI & State:** Delegated to `frontend-agent`. Forms must use `react-hook-form`, routes must be guarded, search must be debounced, and URL params must synchronize.
5. **Quality & Security Gates:** Handled by `code-reviewer`, `security-reviewer`, and `qa-agent` before finalizing features.
