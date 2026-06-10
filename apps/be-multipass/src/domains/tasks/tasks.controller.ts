import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js'
import { TaskTrackerService } from './task-tracker.service.js'

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly taskTracker: TaskTrackerService) {}

  @Get('running')
  getRunning() {
    return this.taskTracker.getAll()
  }
}
