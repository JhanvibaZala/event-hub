---
name: rabbitmq-patterns
description: Architectural standards and guidelines for asynchronous messaging, RabbitMQ topology, worker services, retry strategies, and background job processing in EventHub.
---

# RabbitMQ Messaging & Worker Architecture Standards

This skill defines the messaging topology, consumer idempotency, and background job handling using RabbitMQ in NestJS.

---

## 1. Topology & Exchanges

EventHub utilizes two primary exchanges:

1. **`eventhub.events` (Type: `topic`):**
   - Emits domain events across the event lifecycle.
   - Routing Keys:
     - `registration.created`: Published when a user registers for an event.
     - `registration.cancelled`: Published when a registration is revoked.
     - `event.updated`: Published when an event schedule or details change.
2. **`eventhub.notifications` (Type: `direct`):**
   - Routes user-targeted notifications to inboxes.
   - Routing Key: `notification.dispatch`.

---

## 2. Queue Configuration & Bindings

| Queue Name | Bound Exchange | Routing Key Pattern | Durable | Dead Letter Queue |
| :--- | :--- | :--- | :--- | :--- |
| `q.registration.processing` | `eventhub.events` | `registration.created` | Yes | `q.registration.dlq` |
| `q.registration.cancellation` | `eventhub.events` | `registration.cancelled` | Yes | `q.registration.dlq` |
| `q.notification.inbox` | `eventhub.notifications` | `notification.dispatch` | Yes | `q.notification.dlq` |
| `q.event.broadcast` | `eventhub.events` | `event.updated` | Yes | `q.event.dlq` |

---

## 3. Worker Implementation Standards

1. **Idempotency:**
   - Consumers must verify whether a job has already been processed using unique event/message IDs (e.g. check if `ticketCode` or `notificationId` exists) to prevent double counting.
2. **Acknowledgments (`ack` / `nack`):**
   - Enable manual or reliable automated acknowledgments.
   - Transient failures (e.g. temporary database disconnection) should trigger controlled retries with exponential backoff.
   - Poison messages (malformed JSON payloads, non-recoverable schema errors) must be rejected and forwarded directly to the DLQ (`channel.nack(msg, false, false)`).
3. **Graceful Shutdown:**
   - Ensure open RabbitMQ channels and connections close gracefully during NestJS application lifecycle events (`onApplicationShutdown`).
