import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Order } from 'sequelize';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { User } from '../users/models/user.model';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { EventSearchDto } from './dto/event-search.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';
import {
  FilterGroup,
  FilterRule,
  validateFilterGroup,
  FIELD_TYPE_MAP,
  FilterField,
} from './dto/filter-rule.dto';
import {
  SortRule,
  parseSortRules,
  SortDirection,
} from './dto/sort-rule.dto';
import {
  encodeCursor,
  decodeCursor,
  KeysetPaginatedResult,
} from '../common/dto/keyset-pagination.dto';

function hasConditionKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  return Reflect.ownKeys(obj).length > 0;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event)
    private readonly eventModel: typeof Event,
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
  ) {}

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private buildRuleCondition(rule: FilterRule): any {
    let val = rule.value;
    const fieldType = FIELD_TYPE_MAP[rule.field];

    if (fieldType === 'date') {
      if (rule.operator === 'between') {
        val = [new Date(val[0]), new Date(val[1])];
      } else {
        val = new Date(val);
      }
    } else if (fieldType === 'number') {
      if (rule.operator === 'between') {
        val = [Number(val[0]), Number(val[1])];
      } else {
        val = Number(val);
      }
    } else if (fieldType === 'boolean') {
      val = val === true || val === 'true';
    }

    switch (rule.operator) {
      case 'equals':
        return { [rule.field]: val };
      case 'contains':
        return { [rule.field]: { [Op.iLike]: `%${val}%` } };
      case 'gt':
        return { [rule.field]: { [Op.gt]: val } };
      case 'gte':
        return { [rule.field]: { [Op.gte]: val } };
      case 'lt':
        return { [rule.field]: { [Op.lt]: val } };
      case 'lte':
        return { [rule.field]: { [Op.lte]: val } };
      case 'between':
        return { [rule.field]: { [Op.between]: val } };
      default:
        return {};
    }
  }

  private buildGroupCondition(group: FilterGroup): any {
    validateFilterGroup(group);
    const logic = group.logic === 'OR' ? Op.or : Op.and;
    const conditions: any[] = [];

    if (group.rules && Array.isArray(group.rules)) {
      for (const rule of group.rules) {
        const cond = this.buildRuleCondition(rule);
        if (hasConditionKeys(cond)) {
          conditions.push(cond);
        }
      }
    }

    if (group.groups && Array.isArray(group.groups)) {
      for (const sub of group.groups) {
        const subCond = this.buildGroupCondition(sub);
        if (hasConditionKeys(subCond)) {
          conditions.push(subCond);
        }
      }
    }

    if (conditions.length === 0) return {};
    if (conditions.length === 1) return conditions[0];
    return { [logic]: conditions };
  }

  async search(dto: EventSearchDto, isPublic = true): Promise<any> {
    return this.executeSearch(dto, isPublic);
  }

  async searchForAdmin(dto: EventSearchDto, user: RequestUser): Promise<any> {
    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
    const ownerId = isSuperAdmin ? undefined : user.id;
    return this.executeSearch(dto, false, ownerId);
  }

  async findAllForAdmin(query: EventQueryDto, user: RequestUser): Promise<any> {
    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
    const ownerId = isSuperAdmin ? undefined : user.id;
    const searchDto: EventSearchDto = {
      search: query.search,
      pagination: {
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        cursor: query.cursor,
      },
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor,
      sort: query.sort as any,
      filters: query.filters,
      categoryId: query.categoryId,
      status: query.status,
      isOnline: query.isOnline,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return this.executeSearch(
      searchDto,
      false,
      ownerId,
      query.sortBy || 'startDate',
      (query.sortOrder as SortDirection) || 'ASC',
    );
  }

  async findAll(query: EventQueryDto, isPublic = true): Promise<any> {
    const searchDto: EventSearchDto = {
      search: query.search,
      pagination: {
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
        cursor: query.cursor,
      },
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      cursor: query.cursor,
      sort: query.sort as any,
      filters: query.filters,
      categoryId: query.categoryId,
      status: query.status,
      isOnline: query.isOnline,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return this.executeSearch(
      searchDto,
      isPublic,
      undefined,
      query.sortBy || 'startDate',
      (query.sortOrder as SortDirection) || 'ASC',
    );
  }

  private async executeSearch(
    dto: EventSearchDto,
    isPublic = true,
    ownerId?: string,
    fallbackSortBy = 'startDate',
    fallbackSortOrder: SortDirection = 'ASC',
  ): Promise<any> {
    const rawLimit = dto.pagination?.limit ?? dto.limit;
    const limit = Math.min(Number(rawLimit) || 10, 100);
    const cursor = dto.pagination?.cursor ?? dto.cursor;

    // 1. Parse and validate multi-sorting rules with ID tie-breaker
    const sortRules: SortRule[] = parseSortRules(
      dto.sort as any,
      fallbackSortBy,
      fallbackSortOrder,
    );
    const sequelizeOrder: Order = sortRules.map((r) => [r.field, r.direction]);

    // 2. Build base filter conditions
    const andConditions: any[] = [];

    // Search across title, description, and location
    if (dto.search && dto.search.trim()) {
      const term = `%${dto.search.trim()}%`;
      andConditions.push({
        [Op.or]: [
          { title: { [Op.iLike]: term } },
          { description: { [Op.iLike]: term } },
          { location: { [Op.iLike]: term } },
        ],
      });
    }

    // Category filter
    if (dto.categoryId) {
      andConditions.push({ categoryId: dto.categoryId });
    }

    // Virtual / in-person filter
    if (dto.isOnline !== undefined) {
      andConditions.push({ isOnline: dto.isOnline });
    }

    // Date range filters
    if (dto.startDate) {
      andConditions.push({ startDate: { [Op.gte]: new Date(dto.startDate) } });
    }
    if (dto.endDate) {
      andConditions.push({ endDate: { [Op.lte]: new Date(dto.endDate) } });
    }

    // Status filter & public visibility enforcement
    if (isPublic) {
      andConditions.push({ status: 'PUBLISHED' });
    } else if (dto.status) {
      andConditions.push({ status: dto.status });
    }

    // Ownership isolation for admin hub queries (never trust client-supplied owner)
    if (ownerId) {
      andConditions.push({ createdById: ownerId });
    }

    // Advanced dynamic multi-filter group
    if (dto.filters) {
      let filterGroup: FilterGroup | undefined;
      if (typeof dto.filters === 'string' && dto.filters.trim()) {
        try {
          filterGroup = JSON.parse(dto.filters);
        } catch {
          throw new BadRequestException('Invalid JSON format for filters parameter');
        }
      } else if (typeof dto.filters === 'object' && dto.filters !== null) {
        filterGroup = dto.filters;
      }

      if (filterGroup) {
        const filterCond = this.buildGroupCondition(filterGroup);
        if (hasConditionKeys(filterCond)) {
          andConditions.push(filterCond);
        }
      }
    }

    // Save base filter without cursor condition for total count computation
    const baseWhere =
      andConditions.length === 0
        ? {}
        : andConditions.length === 1
        ? andConditions[0]
        : { [Op.and]: [...andConditions] };

    // 3. Genuine Keyset cursor condition (No OFFSET)
    if (cursor) {
      const cursorValues = decodeCursor(cursor);
      if (cursorValues.length !== sortRules.length) {
        throw new BadRequestException(
          'Cursor format does not match active sort rules',
        );
      }

      const keysetClauses: any[] = [];
      for (let i = 0; i < sortRules.length; i++) {
        const rule = sortRules[i];
        let val = cursorValues[i];

        if (
          rule.field === 'startDate' ||
          rule.field === 'endDate' ||
          rule.field === 'createdAt'
        ) {
          val = new Date(val);
        } else if (
          rule.field === 'price' ||
          rule.field === 'capacity' ||
          rule.field === 'registeredCount'
        ) {
          val = Number(val);
        }

        const compOp = rule.direction === 'ASC' ? Op.gt : Op.lt;
        const subAnd: any[] = [];

        // All prior fields must be strictly equal
        for (let j = 0; j < i; j++) {
          const prevRule = sortRules[j];
          let prevVal = cursorValues[j];
          if (
            prevRule.field === 'startDate' ||
            prevRule.field === 'endDate' ||
            prevRule.field === 'createdAt'
          ) {
            prevVal = new Date(prevVal);
          } else if (
            prevRule.field === 'price' ||
            prevRule.field === 'capacity' ||
            prevRule.field === 'registeredCount'
          ) {
            prevVal = Number(prevVal);
          }
          subAnd.push({ [prevRule.field]: prevVal });
        }

        // Current field must satisfy > (ASC) or < (DESC)
        subAnd.push({ [rule.field]: { [compOp]: val } });

        if (subAnd.length === 1) {
          keysetClauses.push(subAnd[0]);
        } else {
          keysetClauses.push({ [Op.and]: subAnd });
        }
      }

      if (keysetClauses.length > 0) {
        andConditions.push({ [Op.or]: keysetClauses });
      }
    }

    const finalWhere =
      andConditions.length === 0
        ? {}
        : andConditions.length === 1
        ? andConditions[0]
        : { [Op.and]: andConditions };

    // 4. Execute keyset query: fetch limit + 1 items with zero OFFSET
    const [rows, totalCount] = await Promise.all([
      this.eventModel.findAll({
        where: finalWhere,
        limit: limit + 1,
        order: sequelizeOrder,
        include: [
          {
            model: Category,
            attributes: ['id', 'name', 'slug', 'icon'],
          },
          {
            model: User,
            as: 'organizer',
            attributes: ['id', 'fullName', 'email'],
          },
        ],
      }),
      this.eventModel.count({ where: baseWhere }),
    ]);

    const hasNextPage = rows.length > limit;
    const items = hasNextPage ? rows.slice(0, limit) : rows;

    let nextCursor: string | null = null;
    if (hasNextPage && items.length > 0) {
      const lastItem = items[items.length - 1];
      const nextValues = sortRules.map((rule) => {
        const v = lastItem.get(rule.field);
        return v instanceof Date ? v.toISOString() : v;
      });
      nextCursor = encodeCursor(nextValues);
    }

    const page = Number(dto.pagination?.page ?? dto.page) || 1;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    return {
      items,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages,
        hasNextPage,
        nextCursor,
        hasPrevPage: Boolean(cursor),
        currentCursor: cursor || null,
        activeSort: sortRules,
      },
    };
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Event> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const event = await this.eventModel.findOne({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug', 'icon'],
        },
        {
          model: User,
          as: 'organizer',
          attributes: ['id', 'fullName', 'email'],
        },
      ],
    });

    if (!event) {
      throw new NotFoundException(`Event '${idOrSlug}' not found`);
    }

    return event;
  }

  async findByIdForAdmin(id: string, user: RequestUser): Promise<Event> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );

    const event = await this.eventModel.findOne({
      where: isUuid ? { id } : { slug: id },
      include: [
        {
          model: Category,
          attributes: ['id', 'name', 'slug', 'icon'],
        },
        {
          model: User,
          as: 'organizer',
          attributes: ['id', 'fullName', 'email'],
        },
      ],
    });

    if (!event) {
      throw new NotFoundException(`Event '${id}' not found`);
    }

    const isSuperAdmin =
      user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
    if (!isSuperAdmin && event.createdById !== user.id) {
      throw new ForbiddenException(
        'You are not authorized to access this event',
      );
    }

    return event;
  }

  async create(dto: CreateEventDto, userId: string): Promise<Event> {
    // Validate category exists
    const category = await this.categoryModel.findByPk(dto.categoryId);
    if (!category) {
      throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
    }

    // Validate dates
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('Event end date must be after start date');
    }

    // Generate unique slug
    let slug = this.slugify(dto.title);
    const existing = await this.eventModel.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.eventModel.create({
      ...dto,
      slug,
      createdById: userId,
      registeredCount: 0,
    });
  }

  async update(
    id: string,
    dto: UpdateEventDto,
    user?: RequestUser,
  ): Promise<Event> {
    const event = await this.eventModel.findByPk(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (user) {
      const isSuperAdmin =
        user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
      if (!isSuperAdmin && event.createdById !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to update this event',
        );
      }
    }

    if (dto.categoryId) {
      const category = await this.categoryModel.findByPk(dto.categoryId);
      if (!category) {
        throw new NotFoundException(`Category with ID ${dto.categoryId} not found`);
      }
    }

    // Check dates if provided
    const startDate = dto.startDate ? new Date(dto.startDate) : event.startDate;
    const endDate = dto.endDate ? new Date(dto.endDate) : event.endDate;
    if (endDate <= startDate) {
      throw new BadRequestException('Event end date must be after start date');
    }

    let slug = event.slug;
    if (dto.title && dto.title !== event.title) {
      slug = this.slugify(dto.title);
      const existing = await this.eventModel.findOne({ where: { slug } });
      if (existing && existing.id !== event.id) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    await event.update({
      ...dto,
      slug,
    });

    return this.findByIdOrSlug(event.id);
  }

  async delete(
    id: string,
    user?: RequestUser,
  ): Promise<{ success: boolean; message: string }> {
    const event = await this.eventModel.findByPk(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    if (user) {
      const isSuperAdmin =
        user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
      if (!isSuperAdmin && event.createdById !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to delete this event',
        );
      }
    }

    await event.destroy();
    return { success: true, message: 'Event deleted successfully' };
  }
}
