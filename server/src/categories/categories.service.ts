import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Category } from '../entities/category.entity';
import { Event } from '../entities/event.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

/**
 * Service for managing category entities.
 */
@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
  ) {}

  /**
   * Verify that the event exists.
   */
  private async verifyEventExists(eventId: string): Promise<void> {
    const event = await this.eventRepository.findOne({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Event not found',
      });
    }
  }

  /**
   * Create a single category for an event.
   */
  async create(eventId: string, createCategoryDto: CreateCategoryDto): Promise<Category> {
    await this.verifyEventExists(eventId);

    const existingCategory = await this.categoryRepository.findOne({
      where: { eventId, name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Category "${createCategoryDto.name}" already exists for this event`,
      });
    }

    const category = this.categoryRepository.create({
      eventId,
      name: createCategoryDto.name,
      sortOrder: createCategoryDto.sortOrder ?? 0,
    });

    return this.categoryRepository.save(category);
  }

  /**
   * Bulk create categories for an event.
   */
  async createBulk(eventId: string, createCategoryDtos: CreateCategoryDto[]): Promise<Category[]> {
    await this.verifyEventExists(eventId);

    const categoryNames = createCategoryDtos.map((dto) => dto.name);

    // Check for duplicates in the request
    const uniqueNames = new Set(categoryNames);
    if (uniqueNames.size !== categoryNames.length) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Duplicate category names in request',
      });
    }

    // Check for existing category names
    const existingCategories = await this.categoryRepository.find({
      where: { eventId, name: In(categoryNames) },
    });

    if (existingCategories.length > 0) {
      const existingNames = existingCategories.map((c) => c.name);
      throw new ConflictException({
        code: 'CONFLICT',
        message: `Category names already exist: ${existingNames.join(', ')}`,
      });
    }

    const categories = createCategoryDtos.map((dto) =>
      this.categoryRepository.create({
        eventId,
        name: dto.name,
        sortOrder: dto.sortOrder ?? 0,
      }),
    );

    return this.categoryRepository.save(categories);
  }

  /**
   * Find all categories for an event.
   */
  async findAllByEvent(eventId: string, includeDeleted = false): Promise<Category[]> {
    await this.verifyEventExists(eventId);

    return this.categoryRepository.find({
      where: { eventId },
      withDeleted: includeDeleted,
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  /**
   * Find a category by ID.
   */
  async findOne(id: string, includeDeleted = false): Promise<Category> {
    const category = await this.categoryRepository.findOne({
      where: { id },
      withDeleted: includeDeleted,
    });

    if (!category) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Category not found',
      });
    }

    return category;
  }

  /**
   * Update a category by ID.
   */
  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name !== undefined && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { eventId: category.eventId, name: updateCategoryDto.name },
      });

      if (existingCategory) {
        throw new ConflictException({
          code: 'CONFLICT',
          message: `Category "${updateCategoryDto.name}" already exists for this event`,
        });
      }

      category.name = updateCategoryDto.name;
    }

    if (updateCategoryDto.sortOrder !== undefined) {
      category.sortOrder = updateCategoryDto.sortOrder;
    }

    return this.categoryRepository.save(category);
  }

  /**
   * Soft delete a category by ID.
   */
  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.categoryRepository.softDelete(category.id);
  }
}
