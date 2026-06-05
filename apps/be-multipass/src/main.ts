import 'reflect-metadata'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module.js'
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js'

// Load .env from monorepo root (Node 20.11+ built-in, no extra deps)
// dist/main.js → ../../.. → monorepo root
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
try {
  process.loadEnvFile(resolve(root, '.env'))
} catch {
  // In production env vars are already set via docker/CI
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.useGlobalFilters(new AllExceptionsFilter())

  app.setGlobalPrefix('api')

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:5173',
    credentials: true,
  })

  const port = process.env['PORT'] ?? 4000
  await app.listen(port)
  console.log(`Backend running on http://localhost:${port}/api`)
}

bootstrap()
