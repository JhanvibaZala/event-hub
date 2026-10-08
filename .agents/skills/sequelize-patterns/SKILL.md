---
name: sequelize-patterns
description: Standards and best practices for PostgreSQL data modeling with Sequelize and sequelize-typescript in NestJS, covering model decorators, associations, indexing, migrations, transaction safety, and query optimization.
---

# Sequelize & PostgreSQL Engineering Standards

This skill defines modeling conventions, performance optimizations, and transactional safety guidelines for PostgreSQL with Sequelize in NestJS.

---

## 1. Model Definitions & Decorators

Always use `sequelize-typescript` decorators:
- `@Table({ tableName: 'events', timestamps: true, paranoid: false, underscored: true })`
- Primary Keys: Standardize on `@Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })`
- Enums: Explicitly define PostgreSQL ENUM types for statuses (`'USER' | 'ADMIN'`, `'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'`, `'CONFIRMED' | 'WAITLISTED' | 'CANCELLED'`).
- Nullability & Defaults: Annotate each column with `@AllowNull(false)` and `@Default(...)` where appropriate.

---

## 2. Model Associations & Foreign Keys

1. **One-to-Many (`HasMany` / `BelongsTo`):**
   - Place `@ForeignKey(() => ParentModel)` on the child column.
   - Declare `@BelongsTo(() => ParentModel)` on the child model.
   - Declare `@HasMany(() => ChildModel)` on the parent model.
2. **Eager Loading & Projection:**
   - Always specify `attributes` when using `include` to avoid fetching unneeded columns (e.g. fetch only `['id', 'fullName', 'email']` for User).
   - Use `separate: true` for large 1:N collections to avoid combinatorial cartesian products.

---

## 3. Security Scopes & Hidden Fields

Never return sensitive columns in default queries:
```typescript
@DefaultScope(() => ({
  attributes: { exclude: ['password'] }
}))
@Table({ tableName: 'users' })
export class User extends Model {
  @Column({ type: DataType.STRING, allowNull: false })
  password!: string;
}
```
Provide an explicit scope `withPassword` when authentication verification is required:
```typescript
await this.userModel.scope('withPassword').findOne({ where: { email } });
```

---

## 4. Transaction Management

Critical operations affecting capacity, seat reservations, or financial state MUST execute within managed transactions:
```typescript
await this.sequelize.transaction(async (t) => {
  const event = await this.eventModel.findByPk(eventId, { transaction: t, lock: t.LOCK.UPDATE });
  if (event.registeredCount >= event.capacity) {
    throw new BadRequestException('Event has reached maximum capacity');
  }
  await this.registrationModel.create({ eventId, userId, status: 'CONFIRMED' }, { transaction: t });
  await event.increment('registeredCount', { by: 1, transaction: t });
});
```

---

## 5. Indexing Strategies

Define explicit indexes on columns queried frequently:
- Foreign keys: `categoryId`, `createdById`, `eventId`, `userId`.
- Query filters: `status`, `startDate`, `isOnline`.
- Composite indexes: `[status, startDate]` for the public `/events` listing.
- Unique constraints: `UNIQUE(email)` on Users, `UNIQUE(eventId, userId)` on Registrations to prevent duplicate sign-ups.
