import { Global, Module } from '@nestjs/common';
import { MarketplaceClient } from './marketplace.client';

@Global()
@Module({
  providers: [MarketplaceClient],
  exports: [MarketplaceClient],
})
export class MarketplaceModule {}
