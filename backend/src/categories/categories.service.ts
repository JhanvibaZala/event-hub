import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Category } from './models/category.model';
import { Event } from '../events/models/event.model';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
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

  async findAll(): Promise<Category[]> {
    return this.categoryModel.findAll({
      order: [['name', 'ASC']],
      include: [
        {
          model: Event,
          attributes: ['id', 'status'],
          required: false,
        },
      ],
    });
  }

  async findByIdOrSlug(idOrSlug: string): Promise<Category> {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const category = await this.categoryModel.findOne({
      where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
      include: [{ model: Event }],
    });

    if (!category) {
      throw new NotFoundException(`Category '${idOrSlug}' not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    let slug = this.slugify(dto.name);
    const existing = await this.categoryModel.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    return this.categoryModel.create({
      name: dto.name,
      slug,
      description: dto.description,
      icon: dto.icon,
    });
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    const category = await this.categoryModel.findByPk(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    let slug = category.slug;
    if (dto.name && dto.name !== category.name) {
      slug = this.slugify(dto.name);
      const existing = await this.categoryModel.findOne({ where: { slug } });
      if (existing && existing.id !== category.id) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    await category.update({
      ...dto,
      slug,
    });

    return category;
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const category = await this.categoryModel.findByPk(id);
    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    await category.destroy();
    return { success: true, message: 'Category deleted successfully' };
  }
}
