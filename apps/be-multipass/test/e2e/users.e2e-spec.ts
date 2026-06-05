import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

describe('Users (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let createdUserId: string
  const uniqueSuffix = Date.now().toString()
  const testLogin = `testuser_${uniqueSuffix}`

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { login: { contains: uniqueSuffix } } })
    await app.close()
  })

  describe('GET /api/users', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/users').expect(401)
    })

    it('should return user list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body[0]).not.toHaveProperty('passwordHash')
    })
  })

  describe('POST /api/users', () => {
    it('should return 400 for missing fields', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ login: testLogin })
        .expect(400)
    })

    it('should return 400 for short password', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ login: testLogin, password: '123' })
        .expect(400)
    })

    it('should create user', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ login: testLogin, password: 'Password123!' })
        .expect(201)

      expect(res.body.login).toBe(testLogin)
      expect(res.body).not.toHaveProperty('passwordHash')
      createdUserId = res.body.id
    })

    it('should return 400 for duplicate login', async () => {
      await request(app.getHttpServer())
        .post('/api/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ login: testLogin, password: 'Password123!' })
        .expect(400)
    })
  })

  describe('GET /api/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should return user by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.id).toBe(createdUserId)
    })
  })

  describe('PATCH /api/users/:id', () => {
    it('should update user login', async () => {
      const newLogin = `updated_${uniqueSuffix}`
      const res = await request(app.getHttpServer())
        .patch(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ login: newLogin })
        .expect(200)

      expect(res.body.login).toBe(newLogin)
    })
  })

  describe('DELETE /api/users/:id', () => {
    it('should return 404 for non-existent user', async () => {
      await request(app.getHttpServer())
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404)
    })

    it('should deactivate user', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/users/${createdUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.isActive).toBe(false)
    })
  })
})
