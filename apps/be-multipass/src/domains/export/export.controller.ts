import { Controller, Get, Param, Res } from '@nestjs/common'
import type { Response } from 'express'
import { ExportService } from './export.service.js'
import { Public } from '../../common/decorators/public.decorator.js'

@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':slug')
  @Public()
  async export(@Param('slug') slug: string, @Res() res: Response) {
    const { content, contentType } = await this.exportService.generate(slug)
    res.setHeader('Content-Type', contentType)
    res.send(content)
  }
}
