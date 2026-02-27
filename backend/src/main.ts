import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import express from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const isProd = process.env.NODE_ENV === 'production';

function validateProductionEnv() {
  if (!isProd) return;
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'afc-dev-secret-change-in-prod') {
    throw new Error('En production, JWT_SECRET doit être défini et différent du secret de dev.');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('En production, DATABASE_URL doit être défini.');
  }
}

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  const frontendUrlRaw = process.env.FRONTEND_URL?.trim() || '';
  const allowedOrigins = frontendUrlRaw
    .split(',')
    .map((u) => u.trim().replace(/\/$/, ''))
    .filter(Boolean);
  if (isProd && allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  } else {
    app.enableCors({ origin: true });
  }

  app.use(helmet({ contentSecurityPolicy: false }));

  const uploadsDir = join(process.cwd(), 'uploads', 'avatars');
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true });
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application listening on port ${port}`);
}
bootstrap();
