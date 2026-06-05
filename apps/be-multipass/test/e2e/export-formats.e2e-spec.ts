import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

describe('ExportFormats (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let createdId: string
  const uniqueSuffix = Date.now().toString()
  const testSlug = `test-slug-${uniqueSuffix}`

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'admin', password: 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await prisma.exportFormat.deleteMany({ where: { slug: { contains: uniqueSuffix } } })
    await app.close()
  })

  describe('GET /api/export-formats', () => {
    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/export-formats')
      expect(res.status).toBe(401)
    })

    it('should return array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/export-formats')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/export-formats', () => {
    it('should return 400 for missing required fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/export-formats')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Test' })
      expect(res.status).toBe(400)
    })

    it('should create a format', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/export-formats')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Test Format ${uniqueSuffix}`,
          slug: testSlug,
          lineTemplate: 'add address={address}',
        })
      expect(res.status).toBe(201)
      expect(res.body.slug).toBe(testSlug)
      expect(res.body.isEnabled).toBe(true)
      createdId = res.body.id
    })

    it('should return 400 for duplicate slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/export-formats')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: `Another ${uniqueSuffix}`,
          slug: testSlug,
          lineTemplate: '{address}',
        })
      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/export-formats/:id', () => {
    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/export-formats/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(404)
    })

    it('should return created format', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/export-formats/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(createdId)
    })
  })

  describe('PATCH /api/export-formats/:id', () => {
    it('should update lineTemplate', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/export-formats/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ lineTemplate: '{address}/32' })
      expect(res.status).toBe(200)
      expect(res.body.lineTemplate).toBe('{address}/32')
    })
  })

  describe('DELETE /api/export-formats/:id', () => {
    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/export-formats/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(404)
    })

    it('should soft-disable the format', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/export-formats/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(res.body.isEnabled).toBe(false)
    })

    it('should not appear in active list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/export-formats')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      const found = (res.body as Array<{ id: string }>).find(e => e.id === createdId)
      expect(found).toBeUndefined()
    })

    it('should appear with includeDisabled=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/export-formats?includeDisabled=true')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      const found = (res.body as Array<{ id: string; isEnabled: boolean }>).find(e => e.id === createdId)
      expect(found).toBeDefined()
      expect(found!.isEnabled).toBe(false)
    })
  })
})
