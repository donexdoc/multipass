import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { SettingsService } from './settings.service.js'
import { UpdateSettingDto } from './dto/index.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { ResolverService } from '../resolver/resolver.service.js'

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly moduleRef: ModuleRef,
  ) {}

  @Get()
  getAll() {
    return this.settingsService.getAll()
  }

  @Put(':key')
  async set(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    const result = await this.settingsService.set(key, dto.value)

    if (key === 'DOMAIN_RESOLVE_INTERVAL') {
      const resolver = this.moduleRef.get(ResolverService, { strict: false })
      resolver.reschedule(dto.value)
    }

    return result
  }
}
