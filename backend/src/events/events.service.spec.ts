import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { EventsService } from './events.service';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { EventQueryDto } from './dto/event-query.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('EventsService', () => {
  let service: EventsService;
  let eventModel: {
    findAndCountAll: jest.Mock;
    findOne: jest.Mock;
    findByPk: jest.Mock;
    create: jest.Mock;
    destroy: jest.Mock;
  };
  let categoryModel: {
    findByPk: jest.Mock;
  };

  beforeEach(async () => {
    eventModel = {
      findAndCountAll: jest.fn(),
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

  describe('findAll', () => {
    it('should return paginated events with metadata', async () => {
      const mockEvents = [
        { id: 'ev-1', title: 'Tech Summit 2026', status: 'PUBLISHED' },
      ];
      eventModel.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockEvents,
      });

      const query = Object.assign(new EventQueryDto(), { page: 1, limit: 10 });
      const result = await service.findAll(query);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should apply search terms and category filter', async () => {
      eventModel.findAndCountAll.mockResolvedValue({
        count: 0,
        rows: [],
      });

      const query = Object.assign(new EventQueryDto(), {
        search: 'AI',
        categoryId: 'cat-123',
        page: 1,
        limit: 10,
      });
      await service.findAll(query);

      expect(eventModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-123',
          }),
        }),
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
