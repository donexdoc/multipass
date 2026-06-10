import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { OnEvent } from '@nestjs/event-emitter'
import * as grpc from '@grpc/grpc-js'
import { PrismaService } from '../../prisma/prisma.service.js'
import { SettingsService } from '../settings/settings.service.js'
import {
  SETTINGS_DEFAULTS,
  type SettingKey,
} from '../settings/settings.constants.js'
import type { BgpStatus } from '@multipass/shared'

const GOBGP_PING_TIMEOUT_MS = 3_000
const GOBGP_REQUEST_TIMEOUT_MS = 10_000
const GOBGP_BATCH_SIZE = 1000

// Converts IPv4 range (e.g. "1.2.3.0-1.2.3.255") to minimal list of CIDR blocks.
function rangeToCidrs(range: string): string[] {
  const parts = range.split('-')
  if (parts.length !== 2) return []
  const startStr = parts[0]
  const endStr = parts[1]
  if (!startStr || !endStr) return []

  const ipToInt = (ip: string): number => {
    const octets = ip.split('.').map(Number)
    if (octets.length !== 4) return 0
    return (
      (((octets[0] ?? 0) << 24) |
        ((octets[1] ?? 0) << 16) |
        ((octets[2] ?? 0) << 8) |
        (octets[3] ?? 0)) >>>
      0
    )
  }

  const intToIp = (n: number): string => {
    return [
      (n >>> 24) & 0xff,
      (n >>> 16) & 0xff,
      (n >>> 8) & 0xff,
      n & 0xff,
    ].join('.')
  }

  let start = ipToInt(startStr)
  const end = ipToInt(endStr)
  if (start > end) return []

  const result: string[] = []
  while (start <= end) {
    let prefixLen = 32
    while (prefixLen > 0) {
      const blockSize = 1 << (32 - prefixLen + 1)
      const blockStart = start & ~(blockSize - 1)
      if (blockStart === start && start + blockSize - 1 <= end) {
        prefixLen--
      } else {
        break
      }
    }
    result.push(`${intToIp(start)}/${prefixLen}`)
    start = (start + (1 << (32 - prefixLen))) >>> 0
    if (start === 0) break
  }
  return result
}

// ── Minimal protobuf encoder ──────────────────────────────────────────────────
// Hand-coded binary encoding for the specific GoBGP messages we send.
// Avoids proto files and proto-loader — only @grpc/grpc-js is needed.

function varint(n: number): number[] {
  const bytes: number[] = []
  n >>>= 0
  while (n > 127) {
    bytes.push((n & 0x7f) | 0x80)
    n >>>= 7
  }
  bytes.push(n)
  return bytes
}

function pbTag(fieldNum: number, wire: 0 | 2): number[] {
  return varint((fieldNum << 3) | wire)
}

function pbBytes(fieldNum: number, data: Uint8Array): number[] {
  return [...pbTag(fieldNum, 2), ...varint(data.length), ...data]
}

function pbString(fieldNum: number, str: string): number[] {
  return pbBytes(fieldNum, Buffer.from(str, 'utf8'))
}

function pbUint32(fieldNum: number, val: number): number[] {
  if (val === 0) return [] // default value in proto3 is omitted
  return [...pbTag(fieldNum, 0), ...varint(val)]
}


function pbMessage(fieldNum: number, bytes: number[]): number[] {
  return pbBytes(fieldNum, new Uint8Array(bytes))
}

// Encodes apipb.IPAddressPrefix { prefix_len, prefix }
// cidr: full CIDR notation like "10.0.0.0/8" or "1.2.3.4/32"
function encodeIPAddressPrefix(cidr: string): number[] {
  const slash = cidr.lastIndexOf('/')
  const ip = slash >= 0 ? cidr.slice(0, slash) : cidr
  const prefixLen = slash >= 0 ? parseInt(cidr.slice(slash + 1), 10) : 32
  return [...pbUint32(1, prefixLen), ...pbString(2, ip)]
}

// Wraps an already-encoded message in google.protobuf.Any { type_url, value }
function encodeAny(typeUrl: string, innerBytes: number[]): number[] {
  return [
    ...pbString(1, typeUrl),
    ...pbMessage(2, innerBytes),
  ]
}

// Encodes Family { afi: AFI_IP=1, safi: SAFI_UNICAST=1 } for IPv4 unicast
function encodeIPv4UnicastFamily(): number[] {
  return [...pbUint32(1, 1), ...pbUint32(2, 1)]
}

// Encodes AddPathRequest for apipb.GobgpApi/AddPath
function buildAddPathRequest(cidr: string, nextHop: string): Buffer {
  const nlri = encodeAny(
    'type.googleapis.com/apipb.IPAddressPrefix',
    encodeIPAddressPrefix(cidr),
  )
  const nhAttr = encodeAny(
    'type.googleapis.com/apipb.NextHopAttribute',
    pbString(1, nextHop), // NextHopAttribute.next_hop = field 1
  )
  const originAttr = encodeAny(
    'type.googleapis.com/apipb.OriginAttribute',
    [], // origin = 0 (IGP), proto3 default → empty bytes
  )

  const path = [
    ...pbMessage(1, nlri),                        // Path.nlri (field 1)
    ...pbMessage(2, nhAttr),                      // Path.pattrs (field 2, first)
    ...pbMessage(2, originAttr),                  // Path.pattrs (field 2, second)
    ...pbMessage(9, encodeIPv4UnicastFamily()),    // Path.family (field 9)
  ]

  // AddPathRequest { table_type=1(omit), vrf_id=2(omit), path=3 }
  return Buffer.from(pbMessage(3, path))
}

// Encodes DeletePathRequest for apipb.GobgpApi/DeletePath
function buildDeletePathRequest(cidr: string, nextHop: string): Buffer {
  const nlri = encodeAny(
    'type.googleapis.com/apipb.IPAddressPrefix',
    encodeIPAddressPrefix(cidr),
  )
  const nhAttr = encodeAny(
    'type.googleapis.com/apipb.NextHopAttribute',
    pbString(1, nextHop),
  )

  const path = [
    ...pbMessage(1, nlri),                      // Path.nlri
    ...pbMessage(2, nhAttr),                    // Path.pattrs (nexthop)
    ...pbMessage(9, encodeIPv4UnicastFamily()), // Path.family (field 9)
  ]

  // DeletePathRequest { table_type=1(omit), vrf_id=2(omit), family=3(omit), path=4 }
  return Buffer.from(pbMessage(4, path))
}

// ── gRPC client ───────────────────────────────────────────────────────────────
// Raw Buffer transport: we serialize/deserialize protobuf manually above.

const identity = (x: Buffer): Buffer => x

const GobgpApiClientCtor = grpc.makeClientConstructor(
  {
    GetBgp: {
      path: '/apipb.GobgpApi/GetBgp',
      requestStream: false,
      responseStream: false,
      requestSerialize: identity,
      requestDeserialize: identity,
      responseSerialize: identity,
      responseDeserialize: identity,
    },
    AddPath: {
      path: '/apipb.GobgpApi/AddPath',
      requestStream: false,
      responseStream: false,
      requestSerialize: identity,
      requestDeserialize: identity,
      responseSerialize: identity,
      responseDeserialize: identity,
    },
    DeletePath: {
      path: '/apipb.GobgpApi/DeletePath',
      requestStream: false,
      responseStream: false,
      requestSerialize: identity,
      requestDeserialize: identity,
      responseSerialize: identity,
      responseDeserialize: identity,
    },
  },
  'apipb.GobgpApi',
  {},
)

// ── Service ───────────────────────────────────────────────────────────────────

const BGP_SETTING_KEYS: SettingKey[] = [
  'BGP_ENABLED',
  'BGP_NEXT_HOP',
  'BGP_GOBGP_API_URL',
]

@Injectable()
export class BgpService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BgpService.name)
  private readonly announced = new Set<string>()
  private lastSyncAt: string | null = null
  private lastError: string | null = null
  private isConnected: boolean = false
  private isSyncing: boolean = false

  private grpcClient: grpc.Client | null = null
  private currentGrpcUrl: string | null = null

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit() {
    await this.initSettings()
  }

  async onModuleDestroy() {
    if (this.grpcClient) {
      this.grpcClient.close()
      this.grpcClient = null
    }
  }

  // Upsert BGP settings on startup so they appear in UI from the very first run.
  // Also migrates BGP_GOBGP_API_URL from the old HTTP format to gRPC host:port.
  private async initSettings() {
    for (const key of BGP_SETTING_KEYS) {
      await this.prisma.setting.upsert({
        where: { key },
        create: { key, value: SETTINGS_DEFAULTS[key] },
        update: {},
      })
    }
    // One-time migration: old value used HTTP URL format (now gRPC host:port is required).
    // GoBGP uses gRPC — URL must be host:port without scheme.
    const current = await this.prisma.setting.findUnique({
      where: { key: 'BGP_GOBGP_API_URL' },
    })
    if (current?.value.startsWith('http://') || current?.value.startsWith('https://')) {
      await this.prisma.setting.update({
        where: { key: 'BGP_GOBGP_API_URL' },
        data: { value: SETTINGS_DEFAULTS['BGP_GOBGP_API_URL'] },
      })
      this.logger.log(
        `Migrated BGP_GOBGP_API_URL from "${current.value}" to gRPC format "${SETTINGS_DEFAULTS['BGP_GOBGP_API_URL']}"`,
      )
    }
  }

  // Returns the gRPC client, recreating it when the URL changes.
  private getClient(grpcUrl: string): grpc.Client {
    if (this.grpcClient && this.currentGrpcUrl === grpcUrl) {
      return this.grpcClient
    }
    if (this.grpcClient) this.grpcClient.close()
    this.grpcClient = new GobgpApiClientCtor(
      grpcUrl,
      grpc.credentials.createInsecure(),
    )
    this.currentGrpcUrl = grpcUrl
    return this.grpcClient
  }

  // Runs every 30 seconds: checks GoBGP reachability.
  // On first connect or reconnect after downtime: clears announced set and triggers full re-sync.
  @Cron('*/30 * * * * *')
  async healthCheck() {
    const enabled = (await this.settings.get('BGP_ENABLED')) === 'true'
    if (!enabled) {
      this.isConnected = false
      return
    }

    const grpcUrl = await this.settings.get('BGP_GOBGP_API_URL')
    const reachable = await this.pingGobgp(grpcUrl)

    if (!reachable) {
      this.isConnected = false
      return
    }

    const wasConnected = this.isConnected
    this.isConnected = true

    if (!wasConnected) {
      // First connect or reconnect after downtime — GoBGP may have lost all routes
      this.logger.log('GoBGP became reachable, triggering full re-sync')
      this.announced.clear()
      await this.syncAll()
    }
  }

  // Returns true if gobgpd is reachable via gRPC (calls GetBgp as a health probe).
  private async pingGobgp(grpcUrl: string): Promise<boolean> {
    try {
      const client = this.getClient(grpcUrl)
      await new Promise<void>((resolve, reject) => {
        const deadline = new Date(Date.now() + GOBGP_PING_TIMEOUT_MS)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(client as any).GetBgp(
          Buffer.alloc(0),
          { deadline },
          (err: Error | null) => {
            if (err) reject(err)
            else resolve()
          },
        )
      })
      return true
    } catch {
      return false
    }
  }

  @OnEvent('addresses.changed')
  async onAddressesChanged() {
    const enabled = (await this.settings.get('BGP_ENABLED')) === 'true'
    if (!enabled) return
    await this.syncIncremental()
  }

  async triggerSync(): Promise<BgpStatus> {
    const enabled = (await this.settings.get('BGP_ENABLED')) === 'true'
    if (enabled && !this.isSyncing) {
      this.syncAll().catch((err: unknown) =>
        this.logger.error(`BGP sync error: ${String(err)}`),
      )
    }
    return this.getStatusWithEnabled()
  }

  async getStatusWithEnabled(): Promise<BgpStatus> {
    const enabled = (await this.settings.get('BGP_ENABLED')) === 'true'
    return {
      isEnabled: enabled,
      isConnected: enabled && this.isConnected,
      isSyncing: this.isSyncing,
      announcedCount: this.announced.size,
      lastSyncAt: this.lastSyncAt,
      lastError: this.lastError,
    }
  }

  // Full re-sync: re-announces current DB state to GoBGP.
  async syncAll() {
    if (this.isSyncing) return
    this.isSyncing = true
    this.logger.log('BGP full sync started')
    try {
      const [nextHop, grpcUrl] = await Promise.all([
        this.settings.get('BGP_NEXT_HOP'),
        this.settings.get('BGP_GOBGP_API_URL'),
      ])

      if (!nextHop) {
        this.lastError = 'BGP_NEXT_HOP is not configured'
        this.logger.warn(this.lastError)
        return
      }

      this.announced.clear()
      await this.syncDiff(grpcUrl, nextHop)

      this.lastSyncAt = new Date().toISOString()
      this.lastError = null
      this.logger.log(`BGP full sync done: ${this.announced.size} prefixes announced`)
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err)
      this.logger.error(`BGP full sync failed: ${this.lastError}`)
    } finally {
      this.isSyncing = false
    }
  }

  // Incremental sync: announce new prefixes, withdraw removed ones.
  private async syncIncremental() {
    try {
      const [nextHop, grpcUrl] = await Promise.all([
        this.settings.get('BGP_NEXT_HOP'),
        this.settings.get('BGP_GOBGP_API_URL'),
      ])

      if (!nextHop) {
        this.lastError = 'BGP_NEXT_HOP is not configured'
        this.logger.warn(this.lastError)
        return
      }

      const counts = { add: 0, remove: 0 }
      await this.syncDiff(grpcUrl, nextHop, counts)

      if (counts.add > 0 || counts.remove > 0) {
        this.logger.log(
          `BGP incremental sync: +${counts.add} / -${counts.remove}, total ${this.announced.size}`,
        )
      }

      this.lastSyncAt = new Date().toISOString()
      this.lastError = null
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : String(err)
      this.logger.error(`BGP incremental sync failed: ${this.lastError}`)
    }
  }

  // Computes diff between announced set and current DB state, applies changes to GoBGP.
  private async syncDiff(
    grpcUrl: string,
    nextHop: string,
    counts?: { add: number; remove: number },
  ) {
    const prefixes = await this.collectPrefixes()
    const currentSet = new Set(prefixes)

    const toWithdraw = [...this.announced].filter((p) => !currentSet.has(p))
    const toAnnounce = prefixes.filter((p) => !this.announced.has(p))

    if (toWithdraw.length > 0) {
      await this.removePaths(grpcUrl, toWithdraw, nextHop)
      for (const p of toWithdraw) this.announced.delete(p)
    }

    if (toAnnounce.length > 0) {
      await this.addPaths(grpcUrl, toAnnounce, nextHop)
      for (const p of toAnnounce) this.announced.add(p)
    }

    if (counts) {
      counts.add = toAnnounce.length
      counts.remove = toWithdraw.length
    }
  }

  // Collect all prefixes to announce from DB.
  private async collectPrefixes(): Promise<string[]> {
    const [sourceAddresses, customEntries, resolvedIps] = await Promise.all([
      this.prisma.sourceAddress.findMany({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] } },
        select: { value: true, type: true },
      }),
      this.prisma.customEntry.findMany({
        where: { type: { in: ['IP', 'SUBNET', 'RANGE'] }, isEnabled: true },
        select: { value: true, type: true },
      }),
      this.prisma.resolvedIp.findMany({ select: { ip: true } }),
    ])

    const prefixes = new Set<string>()

    const addEntry = (value: string, type: string) => {
      if (type === 'IP') {
        prefixes.add(`${value}/32`)
      } else if (type === 'SUBNET') {
        prefixes.add(value)
      } else if (type === 'RANGE') {
        for (const cidr of rangeToCidrs(value)) {
          prefixes.add(cidr)
        }
      }
    }

    for (const row of sourceAddresses) addEntry(row.value, row.type)
    for (const row of customEntries) addEntry(row.value, row.type)
    for (const row of resolvedIps) prefixes.add(`${row.ip}/32`)

    return [...prefixes]
  }

  // Adds prefixes to GoBGP in parallel batches.
  private async addPaths(
    grpcUrl: string,
    prefixes: string[],
    nextHop: string,
  ): Promise<void> {
    for (let i = 0; i < prefixes.length; i += GOBGP_BATCH_SIZE) {
      const batch = prefixes.slice(i, i + GOBGP_BATCH_SIZE)
      await Promise.all(batch.map((cidr) => this.addPath(grpcUrl, cidr, nextHop)))
    }
  }

  // Removes prefixes from GoBGP in parallel batches.
  private async removePaths(
    grpcUrl: string,
    prefixes: string[],
    nextHop: string,
  ): Promise<void> {
    for (let i = 0; i < prefixes.length; i += GOBGP_BATCH_SIZE) {
      const batch = prefixes.slice(i, i + GOBGP_BATCH_SIZE)
      await Promise.all(batch.map((cidr) => this.removePath(grpcUrl, cidr, nextHop)))
    }
  }

  private async addPath(grpcUrl: string, cidr: string, nextHop: string): Promise<void> {
    const client = this.getClient(grpcUrl)
    const request = buildAddPathRequest(cidr, nextHop)
    await new Promise<void>((resolve, reject) => {
      const deadline = new Date(Date.now() + GOBGP_REQUEST_TIMEOUT_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).AddPath(request, { deadline }, (err: Error | null) => {
        if (err) reject(new Error(`GoBGP AddPath ${cidr}: ${err.message}`))
        else resolve()
      })
    })
  }

  private async removePath(grpcUrl: string, cidr: string, nextHop: string): Promise<void> {
    const client = this.getClient(grpcUrl)
    const request = buildDeletePathRequest(cidr, nextHop)
    await new Promise<void>((resolve, reject) => {
      const deadline = new Date(Date.now() + GOBGP_REQUEST_TIMEOUT_MS)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(client as any).DeletePath(request, { deadline }, (err: Error | null) => {
        if (err) reject(new Error(`GoBGP DeletePath ${cidr}: ${err.message}`))
        else resolve()
      })
    })
  }
}
