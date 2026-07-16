import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.module';
import { MarketplaceClient } from '../marketplace/marketplace.client';
import { EventPublisherService } from '../events/events.module';
import { CreateReviewDto, ReplyReviewDto } from './dto/review.dto';

export interface ReviewNode {
  id: string;
  productId: string;
  productName: string;
  creatorId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  rating: number | null;
  comment: string;
  parentId: string | null;
  createdAt: string;
  replies: ReviewNode[];
}

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private marketplace: MarketplaceClient,
    private events: EventPublisherService,
  ) {}

  private async userOwnsProduct(userId: string, productId: string): Promise<boolean> {
    const owned = await this.prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId, status: OrderStatus.PAID },
      },
    });
    return !!owned;
  }

  async getEligibility(productId: string, userId: string, userRole: string) {
    const product = await this.marketplace.getProduct(productId);
    if (!product) {
      throw new NotFoundException(`Product ${productId} not found`);
    }

    const ownsProduct = await this.userOwnsProduct(userId, productId);
    const isCreator = product.creatorId === userId || userRole === 'ADMIN';
    const existingReview = await this.prisma.productReview.findFirst({
      where: { productId, authorId: userId, parentId: null },
    });

    return {
      productId,
      productName: product.title,
      creatorId: product.creatorId,
      ownsProduct,
      isCreator,
      hasReviewed: !!existingReview,
      canReview: ownsProduct && !isCreator && !existingReview,
      canReply: ownsProduct || isCreator,
    };
  }

  async findByProduct(productId: string) {
    const reviews = await this.prisma.productReview.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    });

    const product = await this.marketplace.getProduct(productId);

    const nodes = new Map<string, ReviewNode>();
    const roots: ReviewNode[] = [];

    for (const review of reviews) {
      nodes.set(review.id, {
        id: review.id,
        productId: review.productId,
        productName: review.productName,
        creatorId: review.creatorId,
        authorId: review.authorId,
        authorName: review.authorName,
        authorRole: review.authorRole,
        rating: review.rating,
        comment: review.comment,
        parentId: review.parentId,
        createdAt: review.createdAt.toISOString(),
        replies: [],
      });
    }

    for (const review of reviews) {
      const node = nodes.get(review.id)!;
      if (review.parentId) {
        nodes.get(review.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    const topLevel = reviews.filter((r) => !r.parentId);
    const averageRating =
      topLevel.length > 0
        ? topLevel.reduce((sum, r) => sum + (r.rating ?? 0), 0) / topLevel.length
        : 0;

    return {
      productId,
      productName: product?.title ?? reviews[0]?.productName ?? 'Product',
      reviewCount: topLevel.length,
      averageRating: Math.round(averageRating * 10) / 10,
      reviews: roots.reverse(),
    };
  }

  async createReview(
    dto: CreateReviewDto,
    userId: string,
    userName: string,
    userRole: string,
    userEmail: string,
  ) {
    const product = await this.marketplace.getProduct(dto.productId);
    if (!product) {
      throw new NotFoundException(`Product ${dto.productId} not found`);
    }

    if (product.creatorId === userId) {
      throw new ForbiddenException('Creators cannot review their own listings');
    }

    const ownsProduct = await this.userOwnsProduct(userId, dto.productId);
    if (!ownsProduct) {
      throw new ForbiddenException('Only buyers who own this digital product can review it');
    }

    const existing = await this.prisma.productReview.findFirst({
      where: { productId: dto.productId, authorId: userId, parentId: null },
    });
    if (existing) {
      throw new BadRequestException('You already reviewed this product');
    }

    const review = await this.prisma.productReview.create({
      data: {
        productId: dto.productId,
        productName: product.title,
        creatorId: product.creatorId,
        authorId: userId,
        authorName: userName,
        authorRole: userRole,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.events.publish('review.created', {
      userId: product.creatorId,
      productId: dto.productId,
      productName: product.title,
      reviewId: review.id,
      reviewerName: userName,
      reviewerEmail: userEmail,
      rating: dto.rating,
      comment: dto.comment,
    });

    return review;
  }

  async replyToReview(
    parentId: string,
    dto: ReplyReviewDto,
    userId: string,
    userName: string,
    userRole: string,
    userEmail: string,
  ) {
    const parent = await this.prisma.productReview.findUnique({ where: { id: parentId } });
    if (!parent) {
      throw new NotFoundException(`Review ${parentId} not found`);
    }

    const product = await this.marketplace.getProduct(parent.productId);
    if (!product) {
      throw new NotFoundException(`Product ${parent.productId} not found`);
    }

    const isCreator = product.creatorId === userId || userRole === 'ADMIN';
    const ownsProduct = await this.userOwnsProduct(userId, parent.productId);

    if (!isCreator && !ownsProduct) {
      throw new ForbiddenException('Only owners or the seller can reply to reviews');
    }

    const reply = await this.prisma.productReview.create({
      data: {
        productId: parent.productId,
        productName: parent.productName,
        creatorId: parent.creatorId,
        authorId: userId,
        authorName: userName,
        authorRole: userRole,
        comment: dto.comment,
        parentId: parent.id,
      },
    });

    const notifyIds = new Set<string>();

    if (parent.authorId !== userId) {
      notifyIds.add(parent.authorId);
    }

    for (const targetUserId of notifyIds) {
      await this.events.publish('review.replied', {
        userId: targetUserId,
        productId: parent.productId,
        productName: parent.productName,
        reviewId: reply.id,
        parentReviewId: parent.id,
        replierName: userName,
        replierEmail: userEmail,
        comment: dto.comment,
      });
    }

    return reply;
  }
}
