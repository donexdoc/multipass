import { Module } from '@nestjs/common'
import { TaskTrackerService } from './task-tracker.service.js'
import { TasksController } from './tasks.controller.js'

@Module({
  controllers: [TasksController],
  providers: [TaskTrackerService],
  exports: [TaskTrackerService],
})
export class TasksModule {}
