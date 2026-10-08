---
name: project-testing
description: Quality assurance and testing standards for EventHub, covering NestJS unit tests, Sequelize model mocking, Supertest E2E integration tests, React Testing Library, and Browser MCP automation.
---

# Testing Strategy & QA Runbook

This skill outlines testing standards, mocking conventions, and end-to-end verification workflows across the EventHub stack.

---

## 1. NestJS Unit Testing Standards

- **Target Coverage:** All business logic inside service classes must achieve at least 85% branch coverage.
- **Mocking Sequelize Models:** Use NestJS `@nestjs/testing` with `getModelToken`:
```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    EventsService,
    {
      provide: getModelToken(Event),
      useValue: {
        findAndCountAll: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    },
  ],
}).compile();
```
- Test both sunny-day execution and edge-case exceptions (`NotFoundException`, `BadRequestException`).

---

## 2. Controller & E2E Integration Testing

Use Supertest for end-to-end API verification in `backend/test/*.e2e-spec.ts`:
- **Status Code Assertions:** Verify `201` on creation, `200` on query, `400` on validation rejection, `401` on unauthenticated calls, and `403` on role violations.
- **Interceptor Envelope Verification:** Ensure test responses contain `{ statusCode, success: true, data, timestamp }`.
- **Guard Validation:** Assert that requests without a valid `Bearer` header return `401 Unauthorized`.

---

## 3. Frontend Testing Standards

- **Component Tests:** Test critical forms and cards using React Testing Library (`@testing-library/react`).
- **Redux Slice Tests:** Test reducers and async thunk lifecycle actions independently with mock payloads.
- **User Interactions:** Simulate typing, clicking pagination buttons, and opening modals.

---

## 4. Browser MCP Automation Workflow

Automate high-level user journeys using the Browser MCP server:
1. **User Registration & OTP:**
   - Navigate to `/register`.
   - Submit registration form.
   - Extract generated OTP displayed on the screen.
   - Navigate to `/verify-otp`, submit OTP, and verify redirect to `/events`.
2. **Event Browsing & Pagination:**
   - Type in the search box, verify debounced API call.
   - Click category filter chips.
   - Click next page button and verify URL updates to `?page=2`.
3. **Ticket Booking:**
   - Open event detail, click "Register for Event", confirm modal, and verify registration appears in `/my-registrations`.
