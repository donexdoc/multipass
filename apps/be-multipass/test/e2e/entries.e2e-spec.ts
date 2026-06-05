import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

describe('Entries (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let createdId: string
  const createdIds: string[] = []
  const uniqueSuffix = Date.now().toString()

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'admin', password: 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await prisma.customEntry.deleteMany({ where: { id: { in: createdIds } } })
    await app.close()
  })

  describe('GET /api/entries', () => {
    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/entries')
      expect(res.status).toBe(401)
    })

    it('should return array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/entries', () => {
    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .send({ value: `1.2.3.4`, type: 'IP' })
      expect(res.status).toBe(401)
    })

    it('should return 400 for missing fields', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `1.2.3.4` })
      expect(res.status).toBe(400)
    })

    it('should return 400 for invalid type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `1.2.3.4`, type: 'INVALID' })
      expect(res.status).toBe(400)
    })

    it('should create an IP entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `1.2.3.${Number(uniqueSuffix.slice(-2))}`, type: 'IP', comment: `test-${uniqueSuffix}` })
      expect(res.status).toBe(201)
      expect(res.body.type).toBe('IP')
      expect(res.body.isEnabled).toBe(true)
      createdId = res.body.id
      createdIds.push(res.body.id)
    })

    it('should create a DOMAIN entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `test-${uniqueSuffix}.example.com`, type: 'DOMAIN' })
      expect(res.status).toBe(201)
      expect(res.body.type).toBe('DOMAIN')
      createdIds.push(res.body.id)
    })

    it('should create a SUBNET entry', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: `10.0.${Number(uniqueSuffix.slice(-2))}.0/24`, type: 'SUBNET' })
      expect(res.status).toBe(201)
      createdIds.push(res.body.id)
    })
  })

  describe('GET /api/entries/:id', () => {
    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(404)
    })

    it('should return the created entry', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/entries/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(res.body.id).toBe(createdId)
    })
  })

  describe('PATCH /api/entries/:id', () => {
    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comment: 'updated' })
      expect(res.status).toBe(404)
    })

    it('should update comment', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/entries/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ comment: `updated-${uniqueSuffix}` })
      expect(res.status).toBe(200)
      expect(res.body.comment).toBe(`updated-${uniqueSuffix}`)
    })
  })

  describe('DELETE /api/entries/:id', () => {
    it('should return 404 for non-existent id', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/entries/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(404)
    })

    it('should soft-disable the entry', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/entries/${createdId}`)
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(res.body.isEnabled).toBe(false)
    })

    it('should not appear in active list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/entries')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      const found = (res.body as Array<{ id: string }>).find(e => e.id === createdId)
      expect(found).toBeUndefined()
    })

    it('should appear with includeDisabled=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/entries?includeDisabled=true')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      const found = (res.body as Array<{ id: string; isEnabled: boolean }>).find(e => e.id === createdId)
      expect(found).toBeDefined()
      expect(found!.isEnabled).toBe(false)
    })
  })
})
