import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'
import { SETTINGS_DEFAULTS } from '../../src/domains/settings/settings.constants.js'

describe('Settings (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let savedSettings: Array<{ key: string; value: string; description: string | null }> = []

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    // Save and clear any pre-existing settings rows so tests start from a clean state.
    // afterAll will restore them.
    savedSettings = await prisma.setting.findMany({
      where: { key: { in: Object.keys(SETTINGS_DEFAULTS) } },
      select: { key: true, value: true, description: true },
    })
    await prisma.setting.deleteMany({
      where: { key: { in: Object.keys(SETTINGS_DEFAULTS) } },
    })

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    // Remove rows written during tests, then restore pre-test state
    await prisma.setting.deleteMany({
      where: { key: { in: Object.keys(SETTINGS_DEFAULTS) } },
    })
    if (savedSettings.length > 0) {
      await prisma.setting.createMany({ data: savedSettings })
    }
    await app.close()
  })

  describe('GET /api/settings', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/settings').expect(401)
    })

    it('should return all settings with isDefault=true when no DB rows', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBe(Object.keys(SETTINGS_DEFAULTS).length)

      const setting = res.body[0]
      expect(setting).toHaveProperty('key')
      expect(setting).toHaveProperty('value')
      expect(setting).toHaveProperty('description')
      expect(setting).toHaveProperty('updatedAt')
      expect(setting).toHaveProperty('isDefault')
      expect(setting.isDefault).toBe(true)
      expect(setting.value).toBe(SETTINGS_DEFAULTS['DOMAIN_RESOLVE_INTERVAL'])
    })
  })

  describe('PUT /api/settings/:key', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .put('/api/settings/DOMAIN_RESOLVE_INTERVAL')
        .send({ value: '0 */3 * * *' })
        .expect(401)
    })

    it('should return 400 for missing value', async () => {
      await request(app.getHttpServer())
        .put('/api/settings/DOMAIN_RESOLVE_INTERVAL')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({})
        .expect(400)
    })

    it('should return 400 for empty string value', async () => {
      await request(app.getHttpServer())
        .put('/api/settings/DOMAIN_RESOLVE_INTERVAL')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: '' })
        .expect(400)
    })

    it('should return 404 for unknown key', async () => {
      await request(app.getHttpServer())
        .put('/api/settings/UNKNOWN_KEY')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: 'test' })
        .expect(404)
    })

    it('should update setting and return isDefault=false', async () => {
      const newValue = '0 */3 * * *'
      const res = await request(app.getHttpServer())
        .put('/api/settings/DOMAIN_RESOLVE_INTERVAL')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ value: newValue })
        .expect(200)

      expect(res.body.key).toBe('DOMAIN_RESOLVE_INTERVAL')
      expect(res.body.value).toBe(newValue)
      expect(res.body.isDefault).toBe(false)
    })

    it('should reflect updated value in GET /api/settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const setting = res.body.find((s: { key: string }) => s.key === 'DOMAIN_RESOLVE_INTERVAL')
      expect(setting).toBeDefined()
      expect(setting.value).toBe('0 */3 * * *')
      expect(setting.isDefault).toBe(false)
    })
  })
})
