import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { PurchasesModule } from './purchases/purchases.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CreatorModule } from './creator/creator.module';
import { ReviewsModule } from './reviews/reviews.module';
import { ProfileModule } from './profile/profile.module';
import { StripeModule } from './stripe/stripe.module';
import { XenditModule } from './xendit/xendit.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'redis'),
          port: configService.get<number>('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    AuthModule,
    EventsModule,
    HealthModule,
    MailModule,
    StripeModule,
    XenditModule,
    CheckoutModule,
    OrdersModule,
    QueueModule,
    NotificationsModule,
    PurchasesModule,
    MarketplaceModule,
    CreatorModule,
    ReviewsModule,
    ProfileModule,
  ],
})
export class AppModule {}

