import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { EventsService } from './events.service';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { EventQueryDto } from './dto/event-query.dto';
import { EventSearchDto } from './dto/event-search.dto';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { encodeCursor } from '../common/dto/keyset-pagination.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';

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

    it('Case 1: AND with two rules: both conditions must be combined with Op.and', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          rules: [
            { field: 'price', operator: 'lte', value: 100 },
            { field: 'isOnline', operator: 'equals', value: true },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const countCall = eventModel.count.mock.calls[0][0];

      expect(findAllCall.where[Op.and]).toBeDefined();
      const andClauses = findAllCall.where[Op.and];
      expect(andClauses).toContainEqual({ status: 'PUBLISHED' });
      expect(andClauses).toContainEqual({
        [Op.and]: [{ price: { [Op.lte]: 100 } }, { isOnline: true }],
      });
      expect(countCall.where[Op.and]).toBeDefined();
    });

    it('Case 2: OR with two rules: conditions must be combined with Op.or', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'OR',
          rules: [
            { field: 'price', operator: 'lte', value: 25 },
            { field: 'price', operator: 'gte', value: 100 },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const andClauses = findAllCall.where[Op.and];
      expect(andClauses).toContainEqual({
        [Op.or]: [{ price: { [Op.lte]: 25 } }, { price: { [Op.gte]: 100 } }],
      });
    });

    it('Case 3: AND with nested groups: recursively builds AND conditions', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          groups: [
            {
              logic: 'AND',
              rules: [
                { field: 'location', operator: 'contains', value: 'New York' },
                { field: 'capacity', operator: 'gte', value: 100 },
              ],
            },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const andClauses = findAllCall.where[Op.and];
      expect(andClauses).toContainEqual({
        [Op.and]: [
          { location: { [Op.iLike]: '%New York%' } },
          { capacity: { [Op.gte]: 100 } },
        ],
      });
    });

    it('Case 4: OR with nested groups: recursively builds OR conditions', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'OR',
          groups: [
            {
              logic: 'AND',
              rules: [{ field: 'title', operator: 'contains', value: 'AI' }],
            },
            {
              logic: 'AND',
              rules: [{ field: 'title', operator: 'contains', value: 'Tour' }],
            },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const andClauses = findAllCall.where[Op.and];
      expect(andClauses).toContainEqual({
        [Op.or]: [
          { title: { [Op.iLike]: '%AI%' } },
          { title: { [Op.iLike]: '%Tour%' } },
        ],
      });
    });

    it('Case 5: Multiple groups with different logic operators (nested AND containing OR and AND subgroups)', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          groups: [
            {
              logic: 'OR',
              rules: [
                { field: 'location', operator: 'contains', value: 'San Francisco' },
                { field: 'isOnline', operator: 'equals', value: true },
              ],
            },
            {
              logic: 'AND',
              rules: [
                { field: 'price', operator: 'lte', value: 200 },
                { field: 'capacity', operator: 'gte', value: 50 },
              ],
            },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const andClauses = findAllCall.where[Op.and];
      expect(andClauses).toContainEqual({
        [Op.and]: [
          {
            [Op.or]: [
              { location: { [Op.iLike]: '%San Francisco%' } },
              { isOnline: true },
            ],
          },
          {
            [Op.and]: [
              { price: { [Op.lte]: 200 } },
              { capacity: { [Op.gte]: 50 } },
            ],
          },
        ],
      });
    });

    it('Case 6: A title match with a nonmatching category is excluded by AND condition', async () => {
      const aarambh = createMockEvent({
        id: 'ev-aarambh',
        title: 'Aarambh 2.O',
        categoryId: 'b1cc2043-04af-4f4d-a379-d40f8069e5c7', // Design & UX
        status: 'PUBLISHED',
        price: 20,
      });

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          rules: [
            { field: 'title', operator: 'contains', value: 'o' },
            { field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' },
          ],
        }),
      });

      eventModel.findAll.mockImplementation(({ where }) => {
        const filterClause = where[Op.and].find((c: any) => c[Op.and]);
        const subRules = filterClause[Op.and];
        const categoryCond = subRules.find((r: any) => r.categoryId);
        expect(categoryCond.categoryId).toBe('97b245c6-c766-457e-a3d2-d19d22aa3ea2');
        return aarambh.categoryId === categoryCond.categoryId ? [aarambh] : [];
      });
      eventModel.count.mockResolvedValue(0);

      const result = await service.findAll(query);
      expect(result.items).toHaveLength(0);
      expect(result.items.some((e: any) => e.title === 'Aarambh 2.O')).toBe(false);
    });

    it('Case 7: A category match with a nonmatching title is excluded by AND condition', async () => {
      const reactMasterclass = createMockEvent({
        id: 'ev-react',
        title: 'React & TypeScript Masterclass',
        categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2',
        status: 'PUBLISHED',
        price: 29.99,
      });

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          rules: [
            { field: 'title', operator: 'contains', value: 'o' },
            { field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' },
          ],
        }),
      });

      eventModel.findAll.mockImplementation(({ where }) => {
        const filterClause = where[Op.and].find((c: any) => c[Op.and]);
        const subRules = filterClause[Op.and];
        const titleCond = subRules.find((r: any) => r.title);
        const hasO = reactMasterclass.title.toLowerCase().includes('o');
        return hasO ? [reactMasterclass] : [];
      });
      eventModel.count.mockResolvedValue(0);

      const result = await service.findAll(query);
      expect(result.items).toHaveLength(0);
      expect(result.items.some((e: any) => e.title.includes('React'))).toBe(false);
    });

    it('Case 8: An event matching both conditions is returned', async () => {
      const diljitTour = createMockEvent({
        id: 'ev-diljit',
        title: 'Diljit Tour',
        categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2',
        status: 'PUBLISHED',
        price: 50,
      });

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          rules: [
            { field: 'title', operator: 'contains', value: 'o' },
            { field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' },
          ],
        }),
      });

      eventModel.findAll.mockImplementation(({ where }) => {
        const filterClause = where[Op.and].find((c: any) => c[Op.and]);
        const subRules = filterClause[Op.and];
        const catCond = subRules.find((r: any) => r.categoryId);
        const matchesTitle = diljitTour.title.toLowerCase().includes('o');
        const matchesCat = diljitTour.categoryId === catCond.categoryId;
        return matchesTitle && matchesCat ? [diljitTour] : [];
      });
      eventModel.count.mockResolvedValue(1);

      const result = await service.findAll(query);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Diljit Tour');
    });

    it('Case 9: Empty filters and empty groups do not inject empty clauses', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const query = Object.assign(new EventQueryDto(), {
        filters: JSON.stringify({
          logic: 'AND',
          rules: [],
          groups: [
            {
              logic: 'OR',
              rules: [],
              groups: [],
            },
          ],
        }),
      });

      await service.findAll(query);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      expect(findAllCall.where).toEqual({ status: 'PUBLISHED' });
    });

    it('Case 10: Invalid fields, unsupported operators, or invalid logic throw BadRequestException', async () => {
      // 10a: Invalid field
      await expect(
        service.findAll(
          Object.assign(new EventQueryDto(), {
            filters: JSON.stringify({ rules: [{ field: 'unsupportedField', operator: 'equals', value: 'x' }] }),
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      // 10b: Operator not allowed for type
      await expect(
        service.findAll(
          Object.assign(new EventQueryDto(), {
            filters: JSON.stringify({ rules: [{ field: 'title', operator: 'gt', value: 'test' }] }),
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      // 10c: Invalid logic
      await expect(
        service.findAll(
          Object.assign(new EventQueryDto(), {
            filters: JSON.stringify({ logic: 'XOR', rules: [] }),
          }),
        ),
      ).rejects.toThrow(BadRequestException);

      // 10d: Malformed JSON
      await expect(
        service.findAll(
          Object.assign(new EventQueryDto(), {
            filters: '{invalid-json',
          }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('Case 11: Filtering combined with ascending and descending sorting rules', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const filterPayload = JSON.stringify({
        logic: 'AND',
        rules: [{ field: 'isOnline', operator: 'equals', value: true }],
      });

      // ASC sort
      await service.findAll(
        Object.assign(new EventQueryDto(), {
          filters: filterPayload,
          sort: 'price:ASC',
        }),
      );
      const callAsc = eventModel.findAll.mock.calls[0][0];
      expect(callAsc.order).toEqual([
        ['price', 'ASC'],
        ['id', 'ASC'],
      ]);
      expect(callAsc.where[Op.and]).toContainEqual({ isOnline: true });

      // DESC sort
      await service.findAll(
        Object.assign(new EventQueryDto(), {
          filters: filterPayload,
          sort: 'price:DESC',
        }),
      );
      const callDesc = eventModel.findAll.mock.calls[1][0];
      expect(callDesc.order).toEqual([
        ['price', 'DESC'],
        ['id', 'DESC'],
      ]);
      expect(callDesc.where[Op.and]).toContainEqual({ isOnline: true });
    });

    it('Case 12: Filtering combined with keyset pagination and correct metadata', async () => {
      const mockItem = createMockEvent({
        id: '917166ae-0550-4f92-bf74-af95c76c8350',
        title: 'Diljit Tour',
        price: 50.0,
        startDate: new Date('2026-12-31T18:29:00.000Z'),
      });
      eventModel.findAll.mockResolvedValue([mockItem]);
      eventModel.count.mockResolvedValue(5);

      const cursor = encodeCursor(['20.00', '522d4298-dd63-460f-bcf0-f4d01fdc2a70']);
      const query = Object.assign(new EventQueryDto(), {
        limit: 1,
        sort: 'price:ASC',
        cursor,
        filters: JSON.stringify({
          logic: 'AND',
          rules: [{ field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' }],
        }),
      });

      const res = await service.findAll(query);
      expect(res.meta.total).toBe(5);
      expect(res.meta.limit).toBe(1);
      expect(res.meta.totalPages).toBe(5);
      expect(res.meta.currentCursor).toBe(cursor);

      const countCall = eventModel.count.mock.calls[0][0];
      expect(countCall.where[Op.and]).toContainEqual({
        categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2',
      });
    });

    it('Case 13: Regression test using exact supplied payload excludes Aarambh 2.O and returns matching Technology & AI events', async () => {
      const aarambh = createMockEvent({
        id: '522d4298-dd63-460f-bcf0-f4d01fdc2a70',
        title: 'Aarambh 2.O',
        categoryId: 'b1cc2043-04af-4f4d-a379-d40f8069e5c7', // Design & UX (MISMATCH)
        status: 'PUBLISHED',
        price: 20.0,
      });
      const diljit = createMockEvent({
        id: '917166ae-0550-4f92-bf74-af95c76c8350',
        title: 'Diljit Tour',
        categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2', // MATCH
        status: 'PUBLISHED',
        price: 50.0,
      });
      const aiSummit = createMockEvent({
        id: 'b7059f86-57bd-4ee1-8832-03f4e573e333',
        title: 'Global AI Summit 2026',
        categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2', // MATCH
        status: 'PUBLISHED',
        price: 149.99,
      });

      const mockDb = [aarambh, diljit, aiSummit];

      const exactPayload = {
        logic: 'AND',
        groups: [
          {
            logic: 'AND',
            rules: [
              {
                field: 'title',
                operator: 'contains',
                value: 'o',
              },
              {
                field: 'categoryId',
                operator: 'equals',
                value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2',
              },
            ],
            groups: [],
          },
        ],
      };

      eventModel.findAll.mockImplementation(({ where }) => {
        const andClauses = where[Op.and];
        expect(andClauses).toBeDefined();
        const filterGroupClause = andClauses.find((c: any) => c[Op.and]);
        expect(filterGroupClause).toBeDefined();

        const subConditions = filterGroupClause[Op.and];
        expect(subConditions).toContainEqual({ title: { [Op.iLike]: '%o%' } });
        expect(subConditions).toContainEqual({ categoryId: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' });

        return mockDb.filter(
          (e) =>
            e.status === 'PUBLISHED' &&
            e.title.toLowerCase().includes('o') &&
            e.categoryId === '97b245c6-c766-457e-a3d2-d19d22aa3ea2',
        );
      });
      eventModel.count.mockResolvedValue(2);

      const query = Object.assign(new EventQueryDto(), {
        limit: 6,
        sort: 'price:ASC',
        filters: JSON.stringify(exactPayload),
      });

      const result = await service.findAll(query);

      expect(result.items.some((e: any) => e.title === 'Aarambh 2.O')).toBe(false);
      expect(result.items.some((e: any) => e.categoryId === 'b1cc2043-04af-4f4d-a379-d40f8069e5c7')).toBe(false);

      expect(result.items).toHaveLength(2);
      expect(result.items.map((e: any) => e.title)).toEqual([
        'Diljit Tour',
        'Global AI Summit 2026',
      ]);
    });
  });

  describe('search (POST body endpoint)', () => {
    it('should search with default body, applying limit 10, published status, and default sort', async () => {
      const mockEvent = createMockEvent({
        id: 'ev-search-1',
        title: 'Tech Summit',
        startDate: new Date('2026-11-20T09:00:00Z'),
        price: 100,
        status: 'PUBLISHED',
      });
      eventModel.findAll.mockResolvedValue([mockEvent]);
      eventModel.count.mockResolvedValue(1);

      const result = await service.search({});

      expect(result.items).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.page).toBe(1);
      expect(eventModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 11,
          order: [
            ['startDate', 'ASC'],
            ['id', 'ASC'],
          ],
          where: expect.objectContaining({
            status: 'PUBLISHED',
          }),
        }),
      );
    });

    it('should handle nested pagination and 3+ sort rules preserving order with id tie-breaker', async () => {
      const mockEvents = [
        createMockEvent({
          id: 'ev-1',
          price: 50,
          title: 'Apple Keynote',
          createdAt: new Date('2026-01-01'),
        }),
      ];
      eventModel.findAll.mockResolvedValue(mockEvents);
      eventModel.count.mockResolvedValue(1);

      const dto: EventSearchDto = {
        pagination: {
          page: 2,
          limit: 6,
        },
        sort: [
          { field: 'price', direction: 'ASC' },
          { field: 'title', direction: 'ASC' },
          { field: 'createdAt', direction: 'DESC' },
        ],
      };

      const result = await service.search(dto);

      expect(result.meta.limit).toBe(6);
      expect(result.meta.page).toBe(2);
      expect(eventModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 7,
          order: [
            ['price', 'ASC'],
            ['title', 'ASC'],
            ['createdAt', 'DESC'],
            ['id', 'ASC'],
          ],
        }),
      );
    });

    it('should handle 5-6 filter rules across nested groups with AND/OR logic', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const dto: EventSearchDto = {
        filters: {
          logic: 'AND',
          rules: [
            { field: 'price', operator: 'lte', value: 100 },
            { field: 'capacity', operator: 'gte', value: 20 },
            { field: 'isOnline', operator: 'equals', value: true },
          ],
          groups: [
            {
              logic: 'OR',
              rules: [
                { field: 'title', operator: 'contains', value: 'React' },
                { field: 'location', operator: 'contains', value: 'San Francisco' },
                { field: 'categoryId', operator: 'equals', value: '97b245c6-c766-457e-a3d2-d19d22aa3ea2' },
              ],
            },
          ],
        },
      };

      await service.search(dto);

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const where = findAllCall.where;
      expect(where[Op.and]).toBeDefined();
      expect(where[Op.and]).toContainEqual({ status: 'PUBLISHED' });
    });

    it('should strictly enforce status = PUBLISHED for public searches even if DRAFT is requested in filters or body', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const dto: EventSearchDto = {
        status: 'DRAFT',
        filters: {
          logic: 'AND',
          rules: [{ field: 'status', operator: 'equals', value: 'DRAFT' }],
        },
      };

      await service.search(dto, true); // isPublic = true

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const where = findAllCall.where;
      expect(where[Op.and]).toContainEqual({ status: 'PUBLISHED' });
    });

    it('should allow non-public search (e.g. admin) to search DRAFT status when isPublic is false', async () => {
      eventModel.findAll.mockResolvedValue([]);
      eventModel.count.mockResolvedValue(0);

      const dto: EventSearchDto = {
        status: 'DRAFT',
      };

      await service.search(dto, false); // isPublic = false

      const findAllCall = eventModel.findAll.mock.calls[0][0];
      const where = findAllCall.where;
      expect(where).toEqual({ status: 'DRAFT' });
    });

    it('should handle keyset cursor pagination with limit + 1 and compute nextCursor', async () => {
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
      eventModel.findAll.mockResolvedValue(mockEvents);
      eventModel.count.mockResolvedValue(10);

      const dto: EventSearchDto = {
        pagination: {
          page: 1,
          limit: 1,
        },
        sort: [{ field: 'price', direction: 'ASC' }],
      };

      const result = await service.search(dto);

      expect(result.items).toHaveLength(1);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.nextCursor).toBeDefined();
      expect(result.meta.nextCursor).not.toBeNull();
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

  describe('Admin Data Isolation and Event Ownership', () => {
    const adminUserA: RequestUser = {
      id: 'admin-a-id',
      email: 'adminA@example.com',
      role: 'ADMIN',
    };

    const adminUserB: RequestUser = {
      id: 'admin-b-id',
      email: 'adminB@example.com',
      role: 'ADMIN',
    };

    const superAdminUser: RequestUser = {
      id: 'super-admin-id',
      email: 'superadmin@example.com',
      role: 'SUPER_ADMIN',
    };

    describe('searchForAdmin', () => {
      it('should scope search to only events created by the authenticated admin', async () => {
        eventModel.findAll.mockResolvedValue([]);
        eventModel.count.mockResolvedValue(0);

        await service.searchForAdmin({}, adminUserA);

        expect(eventModel.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdById: 'admin-a-id',
            }),
          }),
        );
      });

      it('should allow SUPER_ADMIN to search across all admins without createdById filter', async () => {
        eventModel.findAll.mockResolvedValue([]);
        eventModel.count.mockResolvedValue(0);

        await service.searchForAdmin({}, superAdminUser);

        expect(eventModel.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              createdById: expect.anything(),
            }),
          }),
        );
      });
    });

    describe('findAllForAdmin', () => {
      it('should scope query to only events created by the authenticated admin', async () => {
        eventModel.findAll.mockResolvedValue([]);
        eventModel.count.mockResolvedValue(0);

        const query = Object.assign(new EventQueryDto(), { limit: 10 });
        await service.findAllForAdmin(query, adminUserA);

        expect(eventModel.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              createdById: 'admin-a-id',
            }),
          }),
        );
      });

      it('should allow SUPER_ADMIN to query all events without createdById filter', async () => {
        eventModel.findAll.mockResolvedValue([]);
        eventModel.count.mockResolvedValue(0);

        const query = Object.assign(new EventQueryDto(), { limit: 10 });
        await service.findAllForAdmin(query, superAdminUser);

        expect(eventModel.findAll).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.not.objectContaining({
              createdById: expect.anything(),
            }),
          }),
        );
      });
    });

    describe('findByIdForAdmin', () => {
      it('should allow an admin to retrieve their own event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          title: 'Event A',
        };
        eventModel.findOne.mockResolvedValue(mockEvent);

        const result = await service.findByIdForAdmin('ev-1', adminUserA);
        expect(result).toBe(mockEvent);
      });

      it('should throw ForbiddenException when an admin attempts to access another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          title: 'Event A',
        };
        eventModel.findOne.mockResolvedValue(mockEvent);

        await expect(
          service.findByIdForAdmin('ev-1', adminUserB),
        ).rejects.toThrow(ForbiddenException);
      });

      it('should allow SUPER_ADMIN to retrieve another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          title: 'Event A',
        };
        eventModel.findOne.mockResolvedValue(mockEvent);

        const result = await service.findByIdForAdmin('ev-1', superAdminUser);
        expect(result).toBe(mockEvent);
      });

      it('should throw NotFoundException if event does not exist', async () => {
        eventModel.findOne.mockResolvedValue(null);

        await expect(
          service.findByIdForAdmin('ev-missing', adminUserA),
        ).rejects.toThrow(NotFoundException);
      });
    });

    describe('update ownership', () => {
      it('should allow an admin to update their own event', async () => {
        const mockEvent = {
          id: 'ev-1',
          title: 'Old Title',
          createdById: 'admin-a-id',
          startDate: new Date('2026-11-01T10:00:00Z'),
          endDate: new Date('2026-11-01T14:00:00Z'),
          update: jest.fn().mockResolvedValue(true),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);
        eventModel.findOne.mockResolvedValue({ ...mockEvent, title: 'New Title' });

        await service.update(
          'ev-1',
          { title: 'New Title' },
          adminUserA,
        );
        expect(mockEvent.update).toHaveBeenCalled();
      });

      it('should throw ForbiddenException when updating another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          title: 'Old Title',
          createdById: 'admin-a-id',
          update: jest.fn(),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);

        await expect(
          service.update('ev-1', { title: 'Hacked Title' }, adminUserB),
        ).rejects.toThrow(ForbiddenException);
        expect(mockEvent.update).not.toHaveBeenCalled();
      });

      it('should allow SUPER_ADMIN to update another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          title: 'Old Title',
          createdById: 'admin-a-id',
          startDate: new Date('2026-11-01T10:00:00Z'),
          endDate: new Date('2026-11-01T14:00:00Z'),
          update: jest.fn().mockResolvedValue(true),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);
        eventModel.findOne.mockResolvedValue({ ...mockEvent, title: 'Updated Title' });

        await service.update(
          'ev-1',
          { title: 'Updated Title' },
          superAdminUser,
        );
        expect(mockEvent.update).toHaveBeenCalled();
      });
    });

    describe('delete ownership', () => {
      it('should allow an admin to delete their own event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          destroy: jest.fn().mockResolvedValue(true),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);

        const result = await service.delete('ev-1', adminUserA);
        expect(result.success).toBe(true);
        expect(mockEvent.destroy).toHaveBeenCalled();
      });

      it('should throw ForbiddenException and NOT delete when deleting another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          destroy: jest.fn().mockResolvedValue(true),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);

        await expect(service.delete('ev-1', adminUserB)).rejects.toThrow(
          ForbiddenException,
        );
        expect(mockEvent.destroy).not.toHaveBeenCalled();
      });

      it('should allow SUPER_ADMIN to delete another admin event', async () => {
        const mockEvent = {
          id: 'ev-1',
          createdById: 'admin-a-id',
          destroy: jest.fn().mockResolvedValue(true),
        };
        eventModel.findByPk.mockResolvedValue(mockEvent);

        const result = await service.delete('ev-1', superAdminUser);
        expect(result.success).toBe(true);
        expect(mockEvent.destroy).toHaveBeenCalled();
      });
    });
  });
});
