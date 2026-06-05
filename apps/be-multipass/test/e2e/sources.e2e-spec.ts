import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

describe('Sources (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let createdId: string
  const uniqueSuffix = Date.now().toString()
  const testName = `Test Source ${uniqueSuffix}`

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await prisma.sourceAddress.deleteMany({
      where: { source: { name: { contains: uniqueSuffix } } },
    })
    await prisma.updateLog.deleteMany({
      where: { source: { name: { contains: uniqueSuffix } } },
    })
    await prisma.source.deleteMany({ where: { name: { contains: uniqueSuffix } } })
    await app.close()
  })

  describe('GET /api/sources', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/sources').expect(401)
    })

    it('should return empty list initially', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sources')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/sources', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/sources').send({}).expect(401)
    })

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/api/sources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: testName })
        .expect(400)
    })

    it('should create source', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sources')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: testName,
          url: 'https://example.com/list.txt',
          updateInterval: '0 4 * * *',
        })
        .expect(201)

      expect(res.body.name).toBe(testName)
      expect(res.body.isEnabled).toBe(true)
      expect(res.body.entryCount).toBe(0)
      expect(res.body.format).toBe('PLAIN_TEXT')
      createdId = res.body.id
    })

    it('should appear in list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sources')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const source = res.body.find((s: { id: string }) => s.id === createdId)
      expect(source).toBeDefined()
    })
  })

  describe('GET /api/sources/:id', () => {
    it('should return 404 for non-existent source', async () => {
      await request(app.getHttpServer())
        .get('/api/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should return source by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/sources/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.id).toBe(createdId)
      expect(res.body.name).toBe(testName)
    })
  })

  describe('PATCH /api/sources/:id', () => {
    it('should return 404 for non-existent source', async () => {
      await request(app.getHttpServer())
        .patch('/api/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'x' })
        .expect(404)
    })

    it('should update source', async () => {
      const newName = `Updated Source ${uniqueSuffix}`
      const res = await request(app.getHttpServer())
        .patch(`/api/sources/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: newName, updateInterval: '0 */12 * * *' })
        .expect(200)

      expect(res.body.name).toBe(newName)
      expect(res.body.updateInterval).toBe('0 */12 * * *')
    })
  })

  describe('POST /api/sources/:id/refresh', () => {
    it('should return 404 for non-existent source', async () => {
      await request(app.getHttpServer())
        .post('/api/sources/00000000-0000-0000-0000-000000000000/refresh')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should trigger refresh and return message', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/sources/${createdId}/refresh`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)

      expect(res.body.message).toBe('Fetch started')
    })
  })

  describe('DELETE /api/sources/:id', () => {
    it('should return 404 for non-existent source', async () => {
      await request(app.getHttpServer())
        .delete('/api/sources/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should soft-disable source', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/sources/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.isEnabled).toBe(false)
    })

    it('should not appear in default list after disable', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sources')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const source = res.body.find((s: { id: string }) => s.id === createdId)
      expect(source).toBeUndefined()
    })

    it('should appear with includeDisabled=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sources?includeDisabled=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const source = res.body.find((s: { id: string }) => s.id === createdId)
      expect(source).toBeDefined()
      expect(source.isEnabled).toBe(false)
    })
  })
})
