import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReplyReviewDto } from './dto/review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private reviewsService: ReviewsService) {}

  @Get('product/:productId')
  @ApiOperation({ summary: 'List reviews and replies for a product' })
  findByProduct(@Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId);
  }

  @Get('product/:productId/eligibility')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if the current user can review or reply' })
  getEligibility(@Param('productId') productId: string, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.getEligibility(productId, user.sub, user.role);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a star review for an owned product' })
  create(@Body() dto: CreateReviewDto, @CurrentUser() user: JwtPayload) {
    return this.reviewsService.createReview(
      dto,
      user.sub,
      user.name ?? user.email.split('@')[0],
      user.role,
      user.email,
    );
  }

  @Post(':parentId/reply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reply to a review thread' })
  reply(
    @Param('parentId') parentId: string,
    @Body() dto: ReplyReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewsService.replyToReview(
      parentId,
      dto,
      user.sub,
      user.name ?? user.email.split('@')[0],
      user.role,
      user.email,
    );
  }
}
