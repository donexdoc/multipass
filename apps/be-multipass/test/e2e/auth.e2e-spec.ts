import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let accessToken: string
  let refreshToken: string

  beforeAll(async () => {
    app = await createTestApp()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/login', () => {
    it('should return 401 for wrong credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: 'admin', password: 'wrongpassword' })
        .expect(401)
    })

    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: 'admin' })
        .expect(400)
    })

    it('should return tokens for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
      accessToken = res.body.accessToken
      refreshToken = res.body.refreshToken
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401)
    })

    it('should return new tokens for valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200)

      expect(res.body).toHaveProperty('accessToken')
      expect(res.body).toHaveProperty('refreshToken')
    })
  })

  describe('Protected routes', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .expect(401)
    })

    it('should return 200 with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
    })
  })
})
