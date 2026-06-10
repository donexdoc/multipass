import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { PrismaModule } from './prisma/prisma.module.js'
import { AuthModule } from './domains/auth/auth.module.js'
import { UsersModule } from './domains/users/users.module.js'
import { SeedModule } from './domains/seed/seed.module.js'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js'
import { SettingsModule } from './domains/settings/settings.module.js'
import { SourcesModule } from './domains/sources/sources.module.js'
import { EntriesModule } from './domains/entries/entries.module.js'
import { ExportFormatsModule } from './domains/export-formats/export-formats.module.js'
import { ExportModule } from './domains/export/export.module.js'
import { ResolverModule } from './domains/resolver/resolver.module.js'
import { LogsModule } from './domains/logs/logs.module.js'
import { StatsModule } from './domains/stats/stats.module.js'
import { TasksModule } from './domains/tasks/tasks.module.js'
import { BgpModule } from './domains/bgp/bgp.module.js'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    SeedModule,
    SettingsModule,
    ExportModule,
    SourcesModule,
    EntriesModule,
    ExportFormatsModule,
    ResolverModule,
    LogsModule,
    StatsModule,
    TasksModule,
    BgpModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
