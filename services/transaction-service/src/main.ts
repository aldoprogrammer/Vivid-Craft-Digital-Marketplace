import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { registerWithConsul } from './consul/register';
import { correlationMiddleware } from './common/correlation';
import { metricsHandler, metricsMiddleware } from './common/metrics';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(correlationMiddleware);
  app.use(metricsMiddleware);
  app.getHttpAdapter().get('/metrics', metricsHandler);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({ origin: true, credentials: true });

  const config = new DocumentBuilder()
    .setTitle('VividCraft Transaction Service')
    .setDescription('Payment processing, invoicing, and digital delivery queue API')
    .setVersion('1.0.0')
    .addTag('Checkout', 'Digital goods checkout')
    .addTag('Orders', 'Order management')
    .addTag('Purchases', 'Owned digital goods & downloads')
    .addTag('Creator', 'Creator sales analytics')
    .addTag('Reviews', 'Product reviews and replies')
    .addTag('Profile', 'Public user profile data')
    .addTag('Stripe', 'Stripe webhooks')
    .addTag('Notifications', 'SSE real-time notifications')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3003);
  await app.listen(port, '0.0.0.0');
  console.log(`Transaction service running on port ${port}`);

  await registerWithConsul({
    name: 'transaction-service',
    port,
    healthPath: '/health/ready',
  });
}

bootstrap();
