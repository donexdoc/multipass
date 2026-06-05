import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Test } from '@nestjs/testing'
import { SeedService } from '../../src/domains/seed/seed.service.js'
import { PrismaService } from '../../src/prisma/prisma.service.js'

vi.mock('bcrypt', () => ({
  hash: vi.fn().mockResolvedValue('hashed_password'),
}))

type PrismaMock = {
  user: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  source: { findFirst: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
  exportFormat: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
}

describe('SeedService (unit)', () => {
  let service: SeedService
  let prisma: PrismaMock

  beforeEach(async () => {
    prisma = {
      user: { findUnique: vi.fn(), create: vi.fn() },
      source: { findFirst: vi.fn(), create: vi.fn() },
      exportFormat: { findUnique: vi.fn(), create: vi.fn() },
    }

    const module = await Test.createTestingModule({
      providers: [SeedService, { provide: PrismaService, useValue: prisma }],
    }).compile()

    service = module.get(SeedService)

    vi.stubEnv('ADMIN_LOGIN', 'admin')
    vi.stubEnv('ADMIN_PASSWORD', 'Admin123!')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  describe('first run — admin does not exist', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: '1', login: 'admin' })
      prisma.source.findFirst.mockResolvedValue(null)
      prisma.source.create.mockResolvedValue({})
      prisma.exportFormat.findUnique.mockResolvedValue(null)
      prisma.exportFormat.create.mockResolvedValue({})
    })

    it('creates admin user with hashed password', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.user.create).toHaveBeenCalledOnce()
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: { login: 'admin', passwordHash: 'hashed_password' },
      })
    })

    it('creates all default sources', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.source.create).toHaveBeenCalledTimes(2)
    })

    it('creates mikrotik export format', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.exportFormat.create).toHaveBeenCalledOnce()
      expect(prisma.exportFormat.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'mikrotik' }) }),
      )
    })
  })

  describe('subsequent runs — admin already exists', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue({ id: '1', login: 'admin' })
    })

    it('does not re-create admin', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it('does not seed sources', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.source.findFirst).not.toHaveBeenCalled()
      expect(prisma.source.create).not.toHaveBeenCalled()
    })

    it('does not seed export format', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.exportFormat.findUnique).not.toHaveBeenCalled()
      expect(prisma.exportFormat.create).not.toHaveBeenCalled()
    })
  })

  describe('env vars not set', () => {
    beforeEach(() => {
      vi.stubEnv('ADMIN_LOGIN', '')
      vi.stubEnv('ADMIN_PASSWORD', '')
    })

    it('does not touch the database at all', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.user.create).not.toHaveBeenCalled()
      expect(prisma.source.create).not.toHaveBeenCalled()
      expect(prisma.exportFormat.create).not.toHaveBeenCalled()
    })
  })

  describe('source idempotency', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: '1', login: 'admin' })
      // first source already exists, second does not
      prisma.source.findFirst.mockResolvedValueOnce({ id: '1' }).mockResolvedValueOnce(null)
      prisma.source.create.mockResolvedValue({})
      prisma.exportFormat.findUnique.mockResolvedValue({ id: '1' })
    })

    it('only creates sources that do not exist yet', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.source.create).toHaveBeenCalledTimes(1)
    })
  })

  describe('export format idempotency', () => {
    beforeEach(() => {
      prisma.user.findUnique.mockResolvedValue(null)
      prisma.user.create.mockResolvedValue({ id: '1', login: 'admin' })
      prisma.source.findFirst.mockResolvedValue({ id: '1' })
      prisma.exportFormat.findUnique.mockResolvedValue({ id: '1' })
    })

    it('does not create export format if it already exists', async () => {
      await service.onApplicationBootstrap()
      expect(prisma.exportFormat.create).not.toHaveBeenCalled()
    })
  })
})
