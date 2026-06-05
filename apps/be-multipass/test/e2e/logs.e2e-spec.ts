import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'

describe('Logs (e2e)', () => {
  let app: INestApplication
  let accessToken: string

  beforeAll(async () => {
    app = await createTestApp()

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: 'admin', password: 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('GET /api/logs', () => {
    it('should return 401 without token', async () => {
      const res = await request(app.getHttpServer()).get('/api/logs')
      expect(res.status).toBe(401)
    })

    it('should return array', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/logs')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should accept type filter SOURCE_FETCH', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/logs?type=SOURCE_FETCH')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      for (const log of res.body as Array<{ type: string }>) {
        expect(log.type).toBe('SOURCE_FETCH')
      }
    })

    it('should accept type filter DOMAIN_RESOLVE', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/logs?type=DOMAIN_RESOLVE')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/logs?limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
      expect(res.status).toBe(200)
      expect((res.body as unknown[]).length).toBeLessThanOrEqual(2)
    })
  })
})
