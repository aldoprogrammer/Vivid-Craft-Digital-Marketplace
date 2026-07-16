import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreatorAnalyticsService } from './creator-analytics.service';

@ApiTags('Creator')
@Controller('creator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CREATOR', 'ADMIN')
@ApiBearerAuth()
export class CreatorController {
  constructor(private analyticsService: CreatorAnalyticsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Sales analytics for the authenticated creator' })
  getAnalytics(@CurrentUser() user: JwtPayload) {
    return this.analyticsService.getForCreator(user.sub);
  }
}
