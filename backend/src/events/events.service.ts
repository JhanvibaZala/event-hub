import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, WhereOptions } from 'sequelize';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { User } from '../users/models/user.model';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { PaginatedResult } from '../common/dto/pagination-query.dto';

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

  async findAll(
    query: EventQueryDto,
    isPublic = true,
  ): Promise<PaginatedResult<Event>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const whereClause: any = {};

    // Live search across title, description, and location
    if (query.search && query.search.trim()) {
      const term = `%${query.search.trim()}%`;
      whereClause[Op.or] = [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        { location: { [Op.iLike]: term } },
      ];
    }

    // Category filter
    if (query.categoryId) {
      whereClause.categoryId = query.categoryId;
    }

    // Virtual / in-person filter
    if (query.isOnline !== undefined) {
      whereClause.isOnline = query.isOnline;
    }

    // Date range filters
    if (query.startDate) {
      whereClause.startDate = { [Op.gte]: new Date(query.startDate) };
    }
    if (query.endDate) {
      whereClause.endDate = { [Op.lte]: new Date(query.endDate) };
    }

    // Status filter: Public queries default to PUBLISHED unless explicitly filtered
    if (query.status) {
      whereClause.status = query.status;
    } else if (isPublic) {
      whereClause.status = 'PUBLISHED';
    }

    // Sorting
    const allowedSortFields = [
      'createdAt',
      'startDate',
      'title',
      'price',
      'capacity',
      'registeredCount',
    ];
    const sortBy = allowedSortFields.includes(query.sortBy)
      ? query.sortBy
      : 'startDate';
    const sortOrder = query.sortOrder === 'DESC' ? 'DESC' : 'ASC';

    const { count, rows } = await this.eventModel.findAndCountAll({
      where: whereClause,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
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
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      items: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
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

  async update(id: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.eventModel.findByPk(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
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

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const event = await this.eventModel.findByPk(id);
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    await event.destroy();
    return { success: true, message: 'Event deleted successfully' };
  }
}
