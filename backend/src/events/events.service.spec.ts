import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EventsService } from './events.service';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { EventQueryDto } from './dto/event-query.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { encodeCursor } from '../common/dto/keyset-pagination.dto';

describe('EventsService', () => {
  let service: EventsService;
  let eventModel: {
    findAll: jest.Mock;
    count: jest.Mock;
    findOne: jest.Mock;
    findByPk: jest.Mock;
    create: jest.Mock;
    destroy: jest.Mock;
  };
  let categoryModel: {
    findByPk: jest.Mock;
  };

  const createMockEvent = (data: Partial<Event>): any => ({
    ...data,
    get: (key: string) => (data as any)[key],
  });

  beforeEach(async () => {
    eventModel = {
      findAll: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    };
    categoryModel = {
      findByPk: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: getModelToken(Event),
          useValue: eventModel,
        },
        {
          provide: getModelToken(Category),
          useValue: categoryModel,
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
  });

  describe('findAll (Keyset Pagination, Multi-Sort & Advanced Filters)', () => {
    it('should return paginated events with keyset metadata and no OFFSET', async () => {
      const mockEvent = createMockEvent({
        id: 'ev-1',
        title: 'Tech Summit 2026',
        startDate: new Date('2026-11-20T09:00:00Z'),
        price: 100,
        status: 'PUBLISHED',
      });

      eventModel.findAll.mockResolvedValue([mockEvent]);
      eventModel.count.mockResolvedValue(1);

      const query = Object.assign(new EventQueryDto(), { limit: 10 });
      const result = await service.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.total).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.nextCursor).toBeNull();
      expect(eventModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 11, // limit + 1 for keyset detection
        }),
      );
    });

    it('should generate nextCursor when rows exceed limit', async () => {
      const mockEvents = [
        createMockEvent({
          id: 'ev-1',
          startDate: new Date('2026-11-20T09:00:00Z'),
          price: 50,
        }),
        createMockEvent({
          id: 'ev-2',
          startDate: new Date('2026-11-21T09:00:00Z'),
          price: 75,
        }),
      ];

      // Request limit: 1, returns 2 rows -> hasNextPage = true
      eventModel.findAll.mockResolvedValue(mockEvents);
      eventModel.count.mockResolvedValue(2);

      const query = Object.assign(new EventQueryDto(), {
        limit: 1,
        sort: 'startDate:ASC',
      });
      const result = await service.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('ev-1');
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.nextCursor).toBeTruthy();
    });

    it('should apply keyset cursor conditions when cursor is provided', async () => {
      const cursor = encodeCursor(['2026-11-20T09:00:00.000Z', 'ev-1']);

      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        limit: 5,
        sort: 'startDate:ASC',
        cursor,
      });

      await service.findAll(query);

      expect(eventModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.any(Object),
        }),
      );
    });

    it('should support multi-sorting with deterministic ID tie-breaker', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        sort: 'price:DESC,startDate:ASC',
      });

      const result = await service.findAll(query);

      expect(result.meta.activeSort).toEqual([
        { field: 'price', direction: 'DESC' },
        { field: 'startDate', direction: 'ASC' },
        { field: 'id', direction: 'DESC' }, // Tie-breaker matches primary direction
      ]);
    });

    it('should throw BadRequestException when sorting by disallowed field', async () => {
      const query = Object.assign(new EventQueryDto(), {
        sort: 'password:ASC',
      });

      await expect(service.findAll(query)).rejects.toThrow(BadRequestException);
    });

    it('should apply advanced multi-filter rules with AND/OR logic', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const filters = {
        logic: 'AND',
        rules: [
          { field: 'price', operator: 'lte', value: 100 },
          { field: 'isOnline', operator: 'equals', value: true },
        ],
        groups: [
          {
            logic: 'OR',
            rules: [
              { field: 'location', operator: 'contains', value: 'San Francisco' },
              { field: 'capacity', operator: 'gte', value: 50 },
            ],
          },
        ],
      };

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify(filters),
      });

      await service.findAll(query);

      expect(eventModel.findAll).toHaveBeenCalled();
    });

    it('should support between operator for numeric and date fields', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const filters = {
        logic: 'AND',
        rules: [
          { field: 'price', operator: 'between', value: [10, 200] },
          {
            field: 'startDate',
            operator: 'between',
            value: ['2026-11-01T00:00:00Z', '2026-12-01T00:00:00Z'],
          },
        ],
      };

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify(filters),
      });

      await service.findAll(query);
      expect(eventModel.findAll).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid filter field or operator', async () => {
      const invalidFieldQuery = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          rules: [{ field: 'unsupportedField', operator: 'equals', value: 'test' }],
        }),
      });

      await expect(service.findAll(invalidFieldQuery)).rejects.toThrow(
        BadRequestException,
      );

      const invalidOpQuery = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          rules: [{ field: 'title', operator: 'gt', value: 'test' }], // gt not allowed on string
        }),
      });

      await expect(service.findAll(invalidOpQuery)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findByIdOrSlug', () => {
    it('should find event by id or slug', async () => {
      eventModel.findOne.mockResolvedValue({
        id: 'ev-1',
        slug: 'tech-summit-2026',
        title: 'Tech Summit 2026',
      });

      const result = await service.findByIdOrSlug('tech-summit-2026');
      expect(result.slug).toBe('tech-summit-2026');
    });

    it('should throw NotFoundException if event does not exist', async () => {
      eventModel.findOne.mockResolvedValue(null);

      await expect(service.findByIdOrSlug('missing-event')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const startDate = new Date('2026-11-01T10:00:00Z');
    const endDate = new Date('2026-11-01T14:00:00Z');

    it('should throw NotFoundException if category does not exist', async () => {
      categoryModel.findByPk.mockResolvedValue(null);

      await expect(
        service.create(
          {
            title: 'New Event',
            description: 'Event Description',
            location: 'Convention Center',
            startDate,
            endDate,
            categoryId: 'invalid-cat',
            capacity: 50,
          },
          'org-1',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create event successfully when category exists', async () => {
      categoryModel.findByPk.mockResolvedValue({ id: 'cat-1', name: 'Tech' });
      eventModel.findOne.mockResolvedValue(null);
      eventModel.create.mockResolvedValue({
        id: 'ev-new',
        title: 'New Event',
        slug: 'new-event',
        organizerId: 'org-1',
      });

      const result = await service.create(
        {
          title: 'New Event',
          description: 'Event Description',
          location: 'Convention Center',
          startDate,
          endDate,
          categoryId: 'cat-1',
          capacity: 50,
        },
        'org-1',
      );

      expect(result.slug).toBe('new-event');
    });
  });
});
