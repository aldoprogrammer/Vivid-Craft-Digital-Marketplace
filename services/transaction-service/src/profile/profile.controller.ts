import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get(':userId/library')
  @ApiOperation({ summary: 'Public showcase of owned digital goods' })
  getLibrary(@Param('userId') userId: string) {
    return this.profileService.getPublicLibrary(userId);
  }

  @Get(':userId/top-products')
  @ApiOperation({ summary: 'Top-selling products for a creator profile' })
  getTopProducts(@Param('userId') userId: string) {
    return this.profileService.getTopProducts(userId);
  }

  @Get(':userId/sales-count')
  @ApiOperation({ summary: 'Total paid sales count for a creator' })
  getSalesCount(@Param('userId') userId: string) {
    return this.profileService.getSalesCount(userId);
  }
}
