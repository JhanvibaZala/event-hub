# EventHub

> A scalable, event-driven Event Management & Registration Platform built with NestJS, Sequelize, PostgreSQL, RabbitMQ, and React with Redux Toolkit.

---

## Features

- **Decoupled Backend:** Built with NestJS & TypeScript, following modular Domain-Driven separation.
- **Sequelize ORM & PostgreSQL:** Strongly typed relational models with `sequelize-typescript`, transactional integrity, and index optimization.
- **Stateless Access Token Auth:** Fast, secure Bearer token authentication with role-based access control (`USER` & `ADMIN`).
- **Email-less OTP Verification:** In-app / API response OTP generation with 5-minute TTL and brute-force protection (No Nodemailer).
- **Guards, Interceptors & Middlewares:**
  - `JwtAuthGuard` & `RolesGuard` for robust route security.
  - Standardized `ResponseInterceptor` wrapping responses into `{ statusCode, success, message, data, timestamp }`.
  - Global `LoggingInterceptor` and `RequestIdMiddleware` for distributed tracing.
- **Asynchronous Processing:** RabbitMQ message broker for capacity calculations, booking audit, and in-app notification dispatch.
- **Interactive React Frontend:** Powered by Redux Toolkit, React Router, React Hook Form, Axios interceptors, debounced search, and URL query synchronization.
- **AI Agent Automation:** Equipped with dedicated Antigravity agents, skills, and MCP tooling (Postgres, Git, Browser).

---

## Directory Structure

```
eventhub/
├── backend/            # NestJS API application
├── frontend/           # React + Redux Toolkit + Vite SPA
├── .agents/            # Workspace-scoped agents and skills
├── docs/               # System documentation & API guides
├── docker-compose.yml  # PostgreSQL & RabbitMQ local containers
├── AGENTS.md           # Agent workflows & architecture rules
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL (v15+) or Docker
- RabbitMQ (v3.12+)

### 2. Infrastructure Setup (Docker)
```bash
docker-compose up -d
```

### 3. Backend Setup
```bash
cd backend
npm install
npm run start:dev
```
Swagger API documentation is available at `http://localhost:3000/api/docs`.

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5174` (or `http://localhost:5173`) in your browser.

---

## Testing & Quality Assurance

### Run Unit & Integration Tests
```bash
cd backend
npm test
```
All 31 unit and service tests run with 100% pass rate covering:
- Authentication & email-less OTP lifecycle (`auth.service.spec.ts`)
- Role authorization guards (`roles.guard.spec.ts`)
- Standard API envelope interceptor (`response.interceptor.spec.ts`)
- Category management & auto-slugification (`categories.service.spec.ts`)
- Event search, pagination, and capacity rules (`events.service.spec.ts`)
- In-app notification center & read states (`notifications.service.spec.ts`)

---

## Seed Accounts & Testing Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@eventhub.com` | `Admin123456!` | Full CRUD on Events & Categories, Attendee Roster Inspection |
| **USER** | `browseruser@example.com` | `Password123!` | Browse, Live Search, Ticket Booking, Notification Inbox |
| **USER** | `alice@example.com` | `SecurePass123!` | Standard Attendee Account |

> **Email-less OTP Policy:** Whenever registering or resetting password, the 6-digit OTP is returned directly in the response and rendered on-screen via the top Dev Banner and in-card code badge with an **Auto-Fill** button. No email configuration is needed!

---

## Antigravity AI Agents & Tools

### Available Agents
- **`orchestrator`**: Master coordinator agent that breaks down tasks and schedules implementations.
- **`backend-agent`**: Implements NestJS controllers, services, guards, and DTOs.
- **`frontend-agent`**: Builds React components, Redux slices, forms, and pages.
- **`database-agent`**: Designs Sequelize models, PostgreSQL indexes, and migrations.
- **`rabbitmq-agent`**: Configures queues, exchanges, and async consumer workers.
- **`code-reviewer`**: Audits clean architecture, SOLID principles, and TypeScript patterns.
- **`security-reviewer`**: Audits JWT auth, OTP validation, RBAC guards, and injection protection.
- **`qa-agent`**: Manages Jest unit tests, integration tests, and Puppeteer browser verification.

### Configured MCP Servers
1. **`postgres`**: Direct DB inspection, schema verification, and safe query execution.
2. **`browser`**: Puppeteer-driven browser navigation, form fills, clicks, and screenshot visual audits.
3. **`git`**: Version control inspection and commit management.

