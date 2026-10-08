# EventHub Architecture & System Design

## 1. Domain Modules & Dependencies

```
                    ┌─────────────────┐
                    │    AppModule    │
                    └────────┬────────┘
                             │
     ┌──────────────┬────────┼────────┬──────────────┬──────────────┐
     │              │        │        │              │              │
┌────▼─────┐ ┌──────▼───┐ ┌──▼───┐ ┌──▼─────────┐ ┌──▼─────────┐ ┌──▼─────────┐
│ Database │ │   Auth   │ │Users │ │ Categories │ │   Events   │ │Registrations│
│  Module  │ │  Module  │ │Module│ │   Module   │ │   Module   │ │   Module    │
└──────────┘ └──────────┘ └──────┘ └────────────┘ └────────────┘ └──────┬──────┘
                                                                        │
                                                                 ┌──────▼──────┐
                                                                 │  RabbitMQ   │
                                                                 │   Module    │
                                                                 └──────┬──────┘
                                                                        │
                                                                 ┌──────▼──────┐
                                                                 │Notifications│
                                                                 │   Module    │
                                                                 └─────────────┘
```

## 2. Key Domain Entities

1. **User:** Core account model with roles (`USER`, `ADMIN`), email verification status, and hashed password.
2. **OtpCode:** Verification tokens with 5-minute lifespan and consumption flags for email-less registration and password resets.
3. **Category:** Classification for events with unique slug identifiers.
4. **Event:** Primary event entity tracking date/time ranges, location, status, capacity, and current registered count.
5. **Registration:** Association entity linking user to event with unique ticket codes and statuses (`CONFIRMED`, `WAITLISTED`, `CANCELLED`).
6. **Notification:** User inbox alerts for booking confirmations, waitlist promotions, and event updates.

## 3. Asynchronous Workflow

When a user calls `POST /api/registrations/:eventId`:
1. `RegistrationsController` passes the request to `RegistrationsService`.
2. `RegistrationsService` initiates a managed Sequelize transaction to lock the event record.
3. If capacity is available, a `CONFIRMED` registration is created, and an asynchronous message is published to RabbitMQ exchange `eventhub.events` with routing key `registration.created`.
4. RabbitMQ worker (`q.registration.processing`) consumes the message:
   - Updates attendee metrics.
   - Emits a notification payload to RabbitMQ exchange `eventhub.notifications` (`notification.dispatch`).
5. Notification consumer writes an in-app `Notification` record to PostgreSQL for the attendee.
