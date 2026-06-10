export interface BgpStatus {
  isEnabled: boolean
  isConnected: boolean
  isSyncing: boolean
  announcedCount: number
  lastSyncAt: string | null
  lastError: string | null
}
