import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { BgpController } from './bgp.controller.js'
import { BgpService } from './bgp.service.js'

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [BgpController],
  providers: [BgpService],
  exports: [BgpService],
})
export class BgpModule {}
