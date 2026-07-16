import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/category.dto';
import { RedisService } from '../redis/redis.module';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const existing = await this.categoryModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Category "${dto.name}" already exists`);
    }

    const category = await this.categoryModel.create(dto);
    await this.redisService.del('categories:all');
    return category;
  }

  async findAll(): Promise<CategoryDocument[]> {
    const cacheKey = 'categories:all';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const categories = await this.categoryModel.find({ isActive: true });
    await this.redisService.set(cacheKey, JSON.stringify(categories), 600);
    return categories;
  }
}
