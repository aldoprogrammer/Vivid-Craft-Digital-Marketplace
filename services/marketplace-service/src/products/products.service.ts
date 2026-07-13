import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { RedisService } from '../redis/redis.module';

@Injectable()
export class ProductsService {
  private readonly cacheTtl: number;
  private readonly imageProcessorUrl: string;

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.cacheTtl = this.configService.get<number>('CACHE_TTL_SECONDS', 300);
    this.imageProcessorUrl = this.configService.get<string>(
      'IMAGE_PROCESSOR_URL',
      'http://image-processor:5000',
    );
  }

  async create(dto: CreateProductDto): Promise<ProductDocument> {
    const product = await this.productModel.create(dto);
    await this.redisService.delPattern('products:*');
    return product;
  }

  async findAll(query: ProductQueryDto): Promise<ProductDocument[]> {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const filter: Record<string, unknown> = { isPublished: true };

    if (query.search) {
      filter.$text = { $search: query.search };
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.category) {
      filter.categories = query.category;
    }
    if (query.tag) {
      filter.tags = query.tag;
    }
    if (query.creatorId) {
      filter.creatorId = query.creatorId;
    }

    const products = await this.productModel.find(filter).sort({ createdAt: -1 }).lean();

    await this.redisService.set(cacheKey, JSON.stringify(products), this.cacheTtl);
    return products as ProductDocument[];
  }

  async findById(id: string): Promise<ProductDocument> {
    const cacheKey = `products:detail:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.productModel.findById(id).lean();
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(product), this.cacheTtl);
    return product as ProductDocument;
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductDocument> {
    const product = await this.productModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.redisService.delPattern('products:*');
    return product as ProductDocument;
  }

  async remove(id: string): Promise<void> {
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    await this.redisService.delPattern('products:*');
  }

  async watermarkPreview(id: string, imageBuffer: Buffer): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    const response = await axios.post(
      `${this.imageProcessorUrl}/watermark`,
      imageBuffer,
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-Product-Id': id,
        },
        responseType: 'json',
      },
    );

    product.watermarkedImagePath = response.data.filePath;
    product.previewImageUrl =
      response.data.publicUrl ?? `/api/images/files/${response.data.filename}`;
    await product.save();
    await this.redisService.delPattern('products:*');

    return product;
  }
}
