import { Module } from '@nestjs/common';
import { CreatorModule } from '../creator/creator.module';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [CreatorModule],
  controllers: [ProfileController],
  providers: [ProfileService],
})
export class ProfileModule {}
