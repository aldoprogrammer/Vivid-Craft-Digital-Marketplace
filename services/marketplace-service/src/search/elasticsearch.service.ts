import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@elastic/elasticsearch';

const INDEX = 'vividcraft-products';

export interface ProductSearchDoc {
  id: string;
  title: string;
  description: string;
  type: string;
  price: number;
  creatorId: string;
  creatorName: string;
  categories: string[];
  tags: string[];
  isPublished: boolean;
  previewImageUrl?: string;
  favoriteCount?: number;
  createdAt?: string;
}

@Injectable()
export class ElasticsearchService implements OnModuleInit {
  private readonly logger = new Logger(ElasticsearchService.name);
  private client: Client | null = null;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const node = this.configService.get<string>('ELASTICSEARCH_URL');
    if (!node) {
      this.logger.log('ELASTICSEARCH_URL not set — using Mongo text search');
      return;
    }
    this.client = new Client({ node });
    try {
      const exists = await this.client.indices.exists({ index: INDEX });
      if (!exists) {
        await this.client.indices.create({
          index: INDEX,
          mappings: {
            properties: {
              title: { type: 'text' },
              description: { type: 'text' },
              type: { type: 'keyword' },
              creatorName: { type: 'text' },
              categories: { type: 'keyword' },
              tags: { type: 'keyword' },
              isPublished: { type: 'boolean' },
              price: { type: 'float' },
              createdAt: { type: 'date' },
            },
          },
        });
      }
      this.logger.log('Elasticsearch connected');
    } catch (err) {
      this.logger.warn(`Elasticsearch unavailable: ${(err as Error).message}`);
      this.client = null;
    }
  }

  isEnabled() {
    return !!this.client;
  }

  async indexProduct(doc: ProductSearchDoc) {
    if (!this.client) return;
    try {
      await this.client.index({
        index: INDEX,
        id: doc.id,
        document: doc,
        refresh: true,
      });
    } catch (err) {
      this.logger.warn(`ES index failed: ${(err as Error).message}`);
    }
  }

  async deleteProduct(id: string) {
    if (!this.client) return;
    try {
      await this.client.delete({ index: INDEX, id, refresh: true });
    } catch {
      // ignore missing
    }
  }

  async search(params: {
    search?: string;
    type?: string;
    category?: string;
    tag?: string;
    creatorId?: string;
  }): Promise<ProductSearchDoc[] | null> {
    if (!this.client) return null;
    try {
      const must: Record<string, unknown>[] = [{ term: { isPublished: true } }];
      if (params.search) {
        must.push({
          multi_match: {
            query: params.search,
            fields: ['title^3', 'description', 'creatorName', 'tags', 'categories'],
          },
        });
      }
      if (params.type) must.push({ term: { type: params.type } });
      if (params.category) must.push({ term: { categories: params.category } });
      if (params.tag) must.push({ term: { tags: params.tag } });
      if (params.creatorId) must.push({ term: { creatorId: params.creatorId } });

      const result = await this.client.search<ProductSearchDoc>({
        index: INDEX,
        query: { bool: { must } },
        sort: [{ createdAt: { order: 'desc', unmapped_type: 'date' } }],
        size: 100,
      });

      return result.hits.hits.map((h) => h._source!).filter(Boolean);
    } catch (err) {
      this.logger.warn(`ES search failed, falling back to Mongo: ${(err as Error).message}`);
      return null;
    }
  }
}
