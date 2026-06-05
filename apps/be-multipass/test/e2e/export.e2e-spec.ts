import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

describe('Export (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  const uniqueSuffix = Date.now().toString()
  const testSlug = `export-test-${uniqueSuffix}`

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    await prisma.exportFormat.create({
      data: {
        name: `Export Test ${uniqueSuffix}`,
        slug: testSlug,
        lineTemplate: 'route add {address}',
        contentType: 'text/plain',
      },
    })
  })

  afterAll(async () => {
    await prisma.exportFormat.deleteMany({ where: { slug: { contains: uniqueSuffix } } })
    await app.close()
  })

  describe('GET /api/export/:slug', () => {
    it('should return 404 for unknown slug', async () => {
      const res = await request(app.getHttpServer()).get('/api/export/nonexistent-slug-xyz')
      expect(res.status).toBe(404)
    })

    it('should return text output for existing enabled format (public)', async () => {
      const res = await request(app.getHttpServer()).get(`/api/export/${testSlug}`)
      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('text/plain')
    })

    it('should return 404 for disabled format', async () => {
      await prisma.exportFormat.update({ where: { slug: testSlug }, data: { isEnabled: false } })
      const res = await request(app.getHttpServer()).get(`/api/export/${testSlug}`)
      expect(res.status).toBe(404)
      // restore
      await prisma.exportFormat.update({ where: { slug: testSlug }, data: { isEnabled: true } })
    })
  })
})
