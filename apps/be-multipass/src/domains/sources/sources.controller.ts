import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { SourcesService } from './sources.service.js'
import { CreateSourceDto, UpdateSourceDto } from './dto/index.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('sources')
@UseGuards(JwtAuthGuard)
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    return this.sourcesService.findAll(includeDisabled === 'true')
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.sourcesService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateSourceDto) {
    return this.sourcesService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSourceDto) {
    return this.sourcesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.sourcesService.remove(id)
  }

  @Post(':id/refresh')
  refresh(@Param('id') id: string) {
    return this.sourcesService.refresh(id)
  }
}
