import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'

describe('Resolver (e2e)', () => {
  let app: INestApplication
  let accessToken: string

  beforeAll(async () => {
    app = await createTestApp()

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/resolver/run', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/resolver/run').expect(401)
    })

    it('should accept the trigger and return 202', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/resolver/run')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(202)

      expect(res.body).toHaveProperty('message')
    })
  })
})
