import { Controller, Get, UseGuards } from '@nestjs/common'
import { StatsService } from './stats.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  getStats() {
    return this.statsService.getStats()
  }
}
