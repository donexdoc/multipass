import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ExportFormatsService } from './export-formats.service.js'
import { CreateExportFormatDto, UpdateExportFormatDto } from './dto/index.js'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'

@Controller('export-formats')
@UseGuards(JwtAuthGuard)
export class ExportFormatsController {
  constructor(private readonly exportFormatsService: ExportFormatsService) {}

  @Get()
  findAll(@Query('includeDisabled') includeDisabled?: string) {
    return this.exportFormatsService.findAll(includeDisabled === 'true')
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exportFormatsService.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateExportFormatDto) {
    return this.exportFormatsService.create(dto)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExportFormatDto) {
    return this.exportFormatsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exportFormatsService.remove(id)
  }
}
