import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import type { INestApplication } from '@nestjs/common'
import { createTestApp } from '../helpers/test-app.js'
import { TaskTrackerService } from '../../src/domains/tasks/task-tracker.service.js'

describe('Tasks (e2e)', () => {
  let app: INestApplication
  let accessToken: string
  let taskTracker: TaskTrackerService

  beforeAll(async () => {
    app = await createTestApp()
    taskTracker = app.get(TaskTrackerService)

    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ login: process.env['ADMIN_LOGIN'] ?? 'admin', password: process.env['ADMIN_PASSWORD'] ?? 'Admin123!' })
    accessToken = res.body.accessToken
  })

  afterAll(async () => {
    taskTracker.clear()
    await app.close()
  })

  describe('GET /api/tasks/running', () => {
    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/tasks/running').expect(401)
    })

    it('should return empty array when no tasks are running', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks/running')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body).toEqual([])
    })

    it('should return running task with correct shape', async () => {
      const taskId = taskTracker.start('SOURCE_FETCH', 'test-source-id', 'Test Source')

      try {
        const res = await request(app.getHttpServer())
          .get('/api/tasks/running')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)

        expect(res.body).toHaveLength(1)
        expect(res.body[0]).toMatchObject({
          id: taskId,
          type: 'SOURCE_FETCH',
          sourceId: 'test-source-id',
          sourceName: 'Test Source',
        })
        expect(typeof res.body[0].startedAt).toBe('string')
      } finally {
        taskTracker.finish(taskId)
      }
    })

    it('should reflect multiple concurrent tasks', async () => {
      const id1 = taskTracker.start('SOURCE_FETCH', 'src-1', 'Source A')
      const id2 = taskTracker.start('SOURCE_FETCH', 'src-2', 'Source B')
      const id3 = taskTracker.start('DOMAIN_RESOLVE', null, null)

      try {
        const res = await request(app.getHttpServer())
          .get('/api/tasks/running')
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200)

        expect(res.body).toHaveLength(3)
        const ids = res.body.map((t: { id: string }) => t.id)
        expect(ids).toContain(id1)
        expect(ids).toContain(id2)
        expect(ids).toContain(id3)
      } finally {
        taskTracker.finish(id1)
        taskTracker.finish(id2)
        taskTracker.finish(id3)
      }
    })

    it('should not return task after it finishes', async () => {
      const taskId = taskTracker.start('DOMAIN_RESOLVE', null, null)
      taskTracker.finish(taskId)

      const res = await request(app.getHttpServer())
        .get('/api/tasks/running')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(res.body).toEqual([])
    })
  })
})
