import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { ExportFormatsController } from './export-formats.controller.js'
import { ExportFormatsService } from './export-formats.service.js'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ExportFormatsController],
  providers: [ExportFormatsService],
  exports: [ExportFormatsService],
})
export class ExportFormatsModule {}
