import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { ExportModule } from '../export/export.module.js'
import { EntriesController } from './entries.controller.js'
import { EntriesService } from './entries.service.js'

@Module({
  imports: [PrismaModule, AuthModule, ExportModule],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
