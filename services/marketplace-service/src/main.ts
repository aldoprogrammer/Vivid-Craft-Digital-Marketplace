import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { registerWithConsul } from './consul/register';

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
    .setTitle('VividCraft Marketplace Service')
    .setDescription('Digital art, comics, and asset catalog management API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Products', 'Digital product listings')
    .addTag('Categories', 'Product categories')
    .addTag('Tags', 'Product tags')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT || 3002);
  await app.listen(port, '0.0.0.0');
  console.log(`Marketplace service running on port ${port}`);
  await registerWithConsul({ name: 'marketplace-service', port, healthPath: '/health' });
}

bootstrap();
