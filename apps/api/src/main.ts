import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000',
      credentials: true,
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
  console.log(`PulseRank API running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
