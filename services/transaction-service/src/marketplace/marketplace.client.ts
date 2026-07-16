import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MarketplaceProduct {
  _id: string;
  title: string;
  creatorId: string;
  creatorName: string;
  assetFileUrl?: string;
  assetFileName?: string;
  assetMimeType?: string;
}

@Injectable()
export class MarketplaceClient {
  private readonly logger = new Logger(MarketplaceClient.name);
  private baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'MARKETPLACE_SERVICE_URL',
      'http://marketplace-service:3002',
    );
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async getProduct(productId: string): Promise<MarketplaceProduct | null> {
    try {
      const res = await fetch(`${this.baseUrl}/products/${productId}`);
      if (!res.ok) return null;
      return (await res.json()) as MarketplaceProduct;
    } catch (err) {
      this.logger.warn(`Marketplace lookup failed for ${productId}: ${(err as Error).message}`);
      return null;
    }
  }

  async getProductCreatorId(productId: string): Promise<string | null> {
    const product = await this.getProduct(productId);
    return product?.creatorId ?? null;
  }
}
