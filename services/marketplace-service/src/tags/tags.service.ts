import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './schemas/tag.schema';
import { CreateTagDto } from './dto/tag.dto';
import { RedisService } from '../redis/redis.module';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateTagDto): Promise<TagDocument> {
    const existing = await this.tagModel.findOne({ name: dto.name });
    if (existing) {
      throw new ConflictException(`Tag "${dto.name}" already exists`);
    }

    const tag = await this.tagModel.create(dto);
    await this.redisService.del('tags:all');
    return tag;
  }

  async findAll(): Promise<TagDocument[]> {
    const cacheKey = 'tags:all';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const tags = await this.tagModel.find().sort({ usageCount: -1 }).lean();
    await this.redisService.set(cacheKey, JSON.stringify(tags), 600);
    return tags as TagDocument[];
  }
}
