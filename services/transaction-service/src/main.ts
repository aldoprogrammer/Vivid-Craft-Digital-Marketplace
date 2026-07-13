import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3003;
  await app.listen(port, '0.0.0.0');
  console.log(`Transaction service running on port ${port}`);
}

bootstrap();
