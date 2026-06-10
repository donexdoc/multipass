import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { BgpService } from './bgp.service.js'

@Controller('bgp')
@UseGuards(JwtAuthGuard)
export class BgpController {
  constructor(private readonly bgpService: BgpService) {}

  @Get('status')
  getStatus() {
    return this.bgpService.getStatusWithEnabled()
  }

  @Post('sync')
  triggerSync() {
    return this.bgpService.triggerSync()
  }
}
