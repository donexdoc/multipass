import { Injectable } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import type { LogType } from '@multipass/prisma'
import type { RunningTask } from '@multipass/shared'

@Injectable()
export class TaskTrackerService {
  private readonly running = new Map<string, RunningTask>()

  start(type: LogType, sourceId: string | null, sourceName: string | null): string {
    const id = randomUUID()
    this.running.set(id, { id, type, sourceId, sourceName, startedAt: new Date().toISOString() })
    return id
  }

  finish(id: string): void {
    this.running.delete(id)
  }

  getAll(): RunningTask[] {
    return [...this.running.values()]
  }

  clear(): void {
    this.running.clear()
  }
}
