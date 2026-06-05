import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { LogsController } from './logs.controller.js'
import { LogsService } from './logs.service.js'

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LogsController],
  providers: [LogsService],
})
export class LogsModule {}
