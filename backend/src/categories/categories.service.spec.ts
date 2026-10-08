import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { CategoriesService } from './categories.service';
import { Category } from './models/category.model';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let categoryModel: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    destroy: jest.Mock;
  };

  beforeEach(async () => {
    categoryModel = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      destroy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: getModelToken(Category),
          useValue: categoryModel,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should return all categories', async () => {
    categoryModel.findAll.mockResolvedValue([
      { id: 'cat-1', name: 'Tech Conference' },
    ]);

    const result = await service.findAll();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Tech Conference');
  });

  it('should find category by slug', async () => {
    categoryModel.findOne.mockResolvedValue({
      id: 'cat-1',
      slug: 'tech-conference',
      name: 'Tech Conference',
    });

    const result = await service.findByIdOrSlug('tech-conference');
    expect(result.slug).toBe('tech-conference');
  });

  it('should throw NotFoundException if category not found', async () => {
    categoryModel.findOne.mockResolvedValue(null);

    await expect(service.findByIdOrSlug('unknown-slug')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should create a category with slugified name', async () => {
    categoryModel.findOne.mockResolvedValue(null);
    categoryModel.create.mockResolvedValue({
      id: 'cat-2',
      name: 'Music & Arts',
      slug: 'music-arts',
    });

    const result = await service.create({
      name: 'Music & Arts',
      description: 'Music events',
    });

    expect(categoryModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Music & Arts',
        slug: 'music-arts',
      }),
    );
    expect(result.slug).toBe('music-arts');
  });

  it('should append random suffix if category slug already exists', async () => {
    categoryModel.findOne.mockResolvedValue({ id: 'existing', slug: 'music-arts' });
    categoryModel.create.mockImplementation((data) => Promise.resolve({ id: 'cat-new', ...data }));

    const result = await service.create({
      name: 'Music & Arts',
    });

    expect(categoryModel.create).toHaveBeenCalled();
    expect(result.slug).toMatch(/^music-arts-\d{4}$/);
  });
});
