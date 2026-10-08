---
name: pagination-search-filter
description: End-to-end design patterns for server-side pagination, full-text search, multi-field filtering, and sorting in NestJS with Sequelize and React URL query param synchronization.
---

# Pagination, Search & Filter Architecture Standards

This skill defines the contract and implementation rules for querying collections across the backend and frontend.

---

## 1. Backend Contract & DTOs

### Reusable Query DTO
```typescript
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder: 'ASC' | 'DESC' = 'DESC';
}
```

### Standard Paginated Response
All list endpoints must return data structured as:
```typescript
export interface PaginatedResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

---

## 2. Sequelize Query Construction

Build queries safely with Sequelize operators:
```typescript
const offset = (page - 1) * limit;
const whereClause: WhereOptions = {};

if (search) {
  whereClause[Op.or] = [
    { title: { [Op.iLike]: `%${search}%` } },
    { description: { [Op.iLike]: `%${search}%` } },
    { location: { [Op.iLike]: `%${search}%` } },
  ];
}

if (categoryId) {
  whereClause.categoryId = categoryId;
}

if (status) {
  whereClause.status = status;
}

const { count, rows } = await this.eventModel.findAndCountAll({
  where: whereClause,
  limit,
  offset,
  order: [[sortBy, sortOrder]],
  include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
  distinct: true,
});
```

---

## 3. Frontend URL Query Param Synchronization

- The URL query string (`?page=1&search=tech&cat=uuid&sort=startDate:ASC`) is the single source of truth for list state.
- **Debounced Search:** Debounce typing inputs by 350ms before writing to URL search params.
- **Filter Reset:** When filters or search terms change, automatically reset `page` to `1`.
- **Navigation Resilience:** Changing pages or applying filters updates URL parameters via `setSearchParams({ ...params })`, enabling shareable bookmarks and working browser back/forward navigation.
