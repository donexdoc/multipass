import { Controller, Post, UseGuards, HttpCode } from '@nestjs/common'
import { ResolverService } from './resolver.service.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('resolver')
@UseGuards(JwtAuthGuard)
export class ResolverController {
  constructor(private readonly resolverService: ResolverService) {}

  @Post('run')
  @HttpCode(202)
  run() {
    this.resolverService.trigger()
    return { message: 'Resolution started' }
  }
}
