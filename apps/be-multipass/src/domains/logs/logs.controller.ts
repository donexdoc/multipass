import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import type { LogType } from '@multipass/prisma'
import { LogsService } from './logs.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.logsService.findAll({
      type: type as LogType | undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    })
  }
}
