import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'

describe('Stats (e2e)', () => {
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

  describe('GET /api/stats', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/stats').expect(401)
    })

    it('should return stats with correct shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const body = res.body
      expect(typeof body.totalAddresses).toBe('number')
      expect(typeof body.sourceAddresses).toBe('number')
      expect(typeof body.customAddresses).toBe('number')
      expect(typeof body.resolvedIps).toBe('number')
      expect(typeof body.domainsCount).toBe('number')
      expect(typeof body.activeSources).toBe('number')
      expect(typeof body.sourcesWithErrors).toBe('number')
      expect(typeof body.customEntriesCount).toBe('number')
      expect(Array.isArray(body.exportFormats)).toBe(true)
      expect('lastSourceFetch' in body).toBe(true)
      expect('lastDomainResolve' in body).toBe(true)
    })

    it('totalAddresses equals sum of its parts', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stats')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const { totalAddresses, sourceAddresses, customAddresses, resolvedIps } = res.body
      expect(totalAddresses).toBe(sourceAddresses + customAddresses + resolvedIps)
    })
  })
})
