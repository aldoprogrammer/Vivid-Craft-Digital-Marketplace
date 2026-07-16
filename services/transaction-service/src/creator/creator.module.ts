import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreatorController } from './creator.controller';
import { CreatorAnalyticsService } from './creator-analytics.service';

@Module({
  imports: [AuthModule],
  controllers: [CreatorController],
  providers: [CreatorAnalyticsService],
  exports: [CreatorAnalyticsService],
})
export class CreatorModule {}
