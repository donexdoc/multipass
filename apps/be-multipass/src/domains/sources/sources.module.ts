import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { ExportModule } from '../export/export.module.js'
import { TasksModule } from '../tasks/tasks.module.js'
import { SourcesController } from './sources.controller.js'
import { SourcesService } from './sources.service.js'
import { SourceFetcherService } from './source-fetcher.service.js'

@Module({
  imports: [PrismaModule, AuthModule, ExportModule, TasksModule],
  controllers: [SourcesController],
  providers: [SourcesService, SourceFetcherService],
  exports: [SourceFetcherService],
})
export class SourcesModule {}
