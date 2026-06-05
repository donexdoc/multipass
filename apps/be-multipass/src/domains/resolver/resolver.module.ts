import { Module } from '@nestjs/common'
import { PrismaModule } from '../../prisma/prisma.module.js'
import { AuthModule } from '../auth/auth.module.js'
import { SettingsModule } from '../settings/settings.module.js'
import { ExportModule } from '../export/export.module.js'
import { ResolverController } from './resolver.controller.js'
import { ResolverService } from './resolver.service.js'

@Module({
  imports: [PrismaModule, AuthModule, SettingsModule, ExportModule],
  controllers: [ResolverController],
  providers: [ResolverService],
})
export class ResolverModule {}
