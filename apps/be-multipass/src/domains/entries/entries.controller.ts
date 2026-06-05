import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { EntriesService } from './entries.service.js'
import { CreateEntryDto, UpdateEntryDto } from './dto/index.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('entries')
@UseGuards(JwtAuthGuard)
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @Get()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    return this.entriesService.findAll(includeDisabled === 'true')
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.entriesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateEntryDto) {
    return this.entriesService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEntryDto) {
    return this.entriesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.entriesService.remove(id)
  }
}
