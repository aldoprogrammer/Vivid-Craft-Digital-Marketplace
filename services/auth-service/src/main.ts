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
    .setTitle('VividCraft Auth Service')
    .setDescription('Authentication, JWT, and Role-Based Access Control API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'User registration, login, and token management')
    .addTag('Users', 'User profile management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`Auth service running on port ${port}`);
  console.log(`Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
