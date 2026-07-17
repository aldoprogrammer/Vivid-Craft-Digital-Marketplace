import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import axios from 'axios';
import { randomUUID } from 'node:crypto';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, UpdateProductDto, ProductQueryDto } from './dto/product.dto';
import { RedisService } from '../redis/redis.module';
import { ElasticsearchService } from '../search/elasticsearch.service';

@Injectable()
export class ProductsService {
  private readonly cacheTtl: number;
  private readonly imageProcessorUrl: string;

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private redisService: RedisService,
    private configService: ConfigService,
    private elasticsearch: ElasticsearchService,
  ) {
    this.cacheTtl = this.configService.get<number>('CACHE_TTL_SECONDS', 300);
    this.imageProcessorUrl = this.configService.get<string>(
      'IMAGE_PROCESSOR_URL',
      'http://image-processor:5000',
    );
  }

  private toSearchDoc(product: ProductDocument) {
    return {
      id: String(product._id),
      title: product.title,
      description: product.description,
      type: product.type,
      price: product.price,
      creatorId: product.creatorId,
      creatorName: product.creatorName,
      categories: product.categories ?? [],
      tags: product.tags ?? [],
      isPublished: product.isPublished,
      previewImageUrl: product.previewImageUrl,
      watermarkedImagePath: product.watermarkedImagePath,
      favoriteCount: product.favoriteCount,
      createdAt: (product as ProductDocument & { createdAt?: Date }).createdAt?.toISOString?.(),
    };
  }

  async create(dto: CreateProductDto, creatorId: string, creatorEmail: string): Promise<ProductDocument> {
    const product = await this.productModel.create({
      ...dto,
      creatorId,
      creatorName: dto.creatorName || creatorEmail,
    });
    await this.redisService.delPattern('products:*');
    await this.elasticsearch.indexProduct(this.toSearchDoc(product));
    return product;
  }

  async findMine(creatorId: string): Promise<ProductDocument[]> {
    const products = await this.productModel
      .find({ creatorId })
      .sort({ createdAt: -1 });
    return products;
  }

  async findFavoritesByUser(userId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({ favoriteUserIds: userId, isPublished: true })
      .sort({ createdAt: -1 });
  }

  async findByCreator(creatorId: string): Promise<ProductDocument[]> {
    return this.productModel
      .find({ creatorId, isPublished: true })
      .sort({ createdAt: -1 });
  }

  async findFavoriteIds(userId: string): Promise<string[]> {
    const products = await this.productModel
      .find({ favoriteUserIds: userId })
      .select('_id')
      .lean();
    return products.map((product) => String(product._id));
  }

  async toggleFavorite(
    id: string,
    userId: string,
    userEmail: string,
  ): Promise<{ favorited: boolean; favoriteCount: number }> {
    const product = await this.productModel
      .findById(id)
      .select('+favoriteUserIds');

    if (!product || !product.isPublished) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    if (product.creatorId === userId) {
      throw new ForbiddenException('You cannot favorite your own listing');
    }

    const favorited = !(product.favoriteUserIds ?? []).includes(userId);
    const updated = await this.productModel.findByIdAndUpdate(
      id,
      favorited
        ? {
            $addToSet: { favoriteUserIds: userId },
            $inc: { favoriteCount: 1 },
          }
        : {
            $pull: { favoriteUserIds: userId },
            $inc: { favoriteCount: -1 },
          },
      { new: true },
    );

    const favoriteCount = Math.max(0, updated?.favoriteCount ?? 0);
    await this.redisService.delPattern('products:*');
    if (updated) {
      await this.elasticsearch.indexProduct(this.toSearchDoc(updated));
    }

    await this.redisService.publish(
      'vividcraft:events',
      JSON.stringify({
        id: randomUUID(),
        type: 'product.favorite_count_changed',
        occurredAt: new Date().toISOString(),
        data: {
          productId: id,
          favoriteCount,
          favorited,
        },
      }),
    );

    if (favorited) {
      await this.redisService.publish(
        'vividcraft:events',
        JSON.stringify({
          id: randomUUID(),
          type: 'product.favorited',
          occurredAt: new Date().toISOString(),
          data: {
            userId: product.creatorId,
            productId: id,
            productName: product.title,
            buyerEmail: userEmail,
            favoriteCount,
          },
        }),
      );
    }

    return {
      favorited,
      favoriteCount,
    };
  }

  async findAll(query: ProductQueryDto): Promise<ProductDocument[] | Record<string, unknown>[]> {
    const cacheKey = `products:list:${JSON.stringify(query)}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    if (query.search && this.elasticsearch.isEnabled()) {
      const esHits = await this.elasticsearch.search({
        search: query.search,
        type: query.type,
        category: query.category,
        tag: query.tag,
        creatorId: query.creatorId,
      });
      if (esHits) {
        const mapped = esHits.map((h) => ({
          _id: h.id,
          title: h.title,
          description: h.description,
          type: h.type,
          price: h.price,
          creatorId: h.creatorId,
          creatorName: h.creatorName,
          categories: h.categories,
          tags: h.tags,
          isPublished: h.isPublished,
          previewImageUrl: h.previewImageUrl,
          watermarkedImagePath: h.watermarkedImagePath,
          favoriteCount: h.favoriteCount ?? 0,
          createdAt: h.createdAt,
        }));
        await this.redisService.set(cacheKey, JSON.stringify(mapped), this.cacheTtl);
        return mapped;
      }
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

    const products = await this.productModel.find(filter).sort({ createdAt: -1 });

    await this.redisService.set(cacheKey, JSON.stringify(products), this.cacheTtl);
    return products;
  }

  async findById(id: string): Promise<ProductDocument> {
    const cacheKey = `products:detail:${id}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(product), this.cacheTtl);
    return product;
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    userId: string,
    isAdmin = false,
  ): Promise<ProductDocument> {
    const existing = await this.productModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (!isAdmin && existing.creatorId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const product = await this.productModel
      .findByIdAndUpdate(id, dto, { new: true });

    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }

    await this.redisService.delPattern('products:*');
    await this.elasticsearch.indexProduct(this.toSearchDoc(product));
    return product;
  }

  async remove(id: string, userId: string, isAdmin = false): Promise<void> {
    const existing = await this.productModel.findById(id);
    if (!existing) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (!isAdmin && existing.creatorId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.productModel.findByIdAndDelete(id);
    await this.redisService.delPattern('products:*');
    await this.elasticsearch.deleteProduct(id);
  }

  async uploadAsset(
    id: string,
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    userId: string,
    isAdmin = false,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (!isAdmin && product.creatorId !== userId) {
      throw new ForbiddenException('You can only upload assets for your own listings');
    }

    const response = await axios.post(
      `${this.imageProcessorUrl}/upload-asset`,
      fileBuffer,
      {
        headers: {
          'Content-Type': mimeType || 'application/octet-stream',
          'X-Product-Id': id,
          'X-Original-Filename': originalName,
        },
        responseType: 'json',
        maxBodyLength: Infinity,
      },
    );

    product.assetFileUrl =
      response.data.publicUrl ?? `/api/images/files/${response.data.filename}`;
    product.assetFileName = response.data.originalName ?? originalName;
    product.assetMimeType = response.data.contentType ?? mimeType;
    await product.save();
    await this.redisService.delPattern('products:*');
    return product;
  }

  async watermarkPreview(
    id: string,
    imageBuffer: Buffer,
    userId: string,
    isAdmin = false,
  ): Promise<ProductDocument> {
    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException(`Product ${id} not found`);
    }
    if (!isAdmin && product.creatorId !== userId) {
      throw new ForbiddenException('You can only watermark your own listings');
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
