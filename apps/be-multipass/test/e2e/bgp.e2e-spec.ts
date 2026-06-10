import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

const BGP_KEYS = ['BGP_ENABLED', 'BGP_NEXT_HOP', 'BGP_GOBGP_API_URL']

describe('BGP (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let accessToken: string
  let savedBgpSettings: Array<{ key: string; value: string; description: string | null }> = []

  beforeAll(async () => {
    app = await createTestApp()
    prisma = app.get(PrismaService)

    // Save auto-initialized BGP settings so we can restore them after tests
    savedBgpSettings = await prisma.setting.findMany({
      where: { key: { in: BGP_KEYS } },
      select: { key: true, value: true, description: true },
    })
    // Ensure BGP_ENABLED=false so tests start in predictable state (DB may be dirty from prior run)
    await prisma.setting.updateMany({ where: { key: 'BGP_ENABLED' }, data: { value: 'false' } })
    await prisma.setting.updateMany({ where: { key: 'BGP_NEXT_HOP' }, data: { value: '' } })

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    // Restore BGP settings to pre-test state
    await prisma.setting.deleteMany({ where: { key: { in: BGP_KEYS } } })
    if (savedBgpSettings.length > 0) {
      await prisma.setting.createMany({ data: savedBgpSettings })
    }
    await app.close()
  })

  describe('GET /api/bgp/status', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/bgp/status').expect(401)
    })

    it('should return status with correct shape', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bgp/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body).toHaveProperty('isEnabled')
      expect(res.body).toHaveProperty('isConnected')
      expect(res.body).toHaveProperty('announcedCount')
      expect(res.body).toHaveProperty('lastSyncAt')
      expect(res.body).toHaveProperty('lastError')
      expect(typeof res.body.isEnabled).toBe('boolean')
      expect(typeof res.body.isConnected).toBe('boolean')
      expect(typeof res.body.announcedCount).toBe('number')
    })

    it('should return isEnabled=false by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/bgp/status')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body.isEnabled).toBe(false)
      expect(res.body.isConnected).toBe(false)
      expect(res.body.announcedCount).toBe(0)
    })
  })

  describe('POST /api/bgp/sync', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).post('/api/bgp/sync').expect(401)
    })

    it('should return status when BGP is disabled', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/bgp/sync')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201)

      expect(res.body.isEnabled).toBe(false)
      expect(res.body.isConnected).toBe(false)
      expect(res.body.announcedCount).toBe(0)
    })

    it('should capture error when BGP enabled but next-hop not configured', async () => {
      await prisma.setting.upsert({
        where: { key: 'BGP_ENABLED' },
        create: { key: 'BGP_ENABLED', value: 'true' },
        update: { value: 'true' },
      })
      await prisma.setting.upsert({
        where: { key: 'BGP_NEXT_HOP' },
        create: { key: 'BGP_NEXT_HOP', value: '' },
        update: { value: '' },
      })

      try {
        // Sync is now async — POST returns immediately, error appears in background.
        await request(app.getHttpServer())
          .post('/api/bgp/sync')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(201)

        // Poll GET /api/bgp/status until isSyncing === false (max 5s).
        let status: { isEnabled: boolean; isSyncing: boolean; lastError: string | null } | undefined
        for (let i = 0; i < 50; i++) {
          const res = await request(app.getHttpServer())
            .get('/api/bgp/status')
            .set('Authorization', `Bearer ${accessToken}`)
          status = res.body as typeof status
          if (!status?.isSyncing) break
          await new Promise((r) => setTimeout(r, 100))
        }

        expect(status?.isEnabled).toBe(true)
        expect(status?.lastError).toContain('BGP_NEXT_HOP')
      } finally {
        await prisma.setting.update({ where: { key: 'BGP_ENABLED' }, data: { value: 'false' } })
      }
    })
  })

  describe('BGP settings auto-initialization', () => {
    it('should have BGP settings created on startup', async () => {
      const bgpSettings = await prisma.setting.findMany({
        where: { key: { in: BGP_KEYS } },
      })
      expect(bgpSettings.length).toBe(BGP_KEYS.length)
      const enabledSetting = bgpSettings.find(s => s.key === 'BGP_ENABLED')
      expect(enabledSetting?.value).toBe('false')
    })

    it('should return BGP settings in GET /api/settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      const bgpEnabled = res.body.find((s: { key: string }) => s.key === 'BGP_ENABLED')
      const bgpNextHop = res.body.find((s: { key: string }) => s.key === 'BGP_NEXT_HOP')
      const bgpApiUrl = res.body.find((s: { key: string }) => s.key === 'BGP_GOBGP_API_URL')

      expect(bgpEnabled).toBeDefined()
      expect(bgpNextHop).toBeDefined()
      expect(bgpApiUrl).toBeDefined()
      expect(bgpEnabled.value).toBe('false')
    })
  })
})
