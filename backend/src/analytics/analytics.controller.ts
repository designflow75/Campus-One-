import { Controller, Get, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('parent/:studentId')
  @Roles('PARENT', 'ADMIN')
  async getParentDashboard(@Param('studentId') studentId: string, @Request() req: any) {
    if (req.user.role === 'PARENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.parentId !== req.user.userId) {
        throw new ForbiddenException('Access denied to this student record');
      }
    }
    return this.analyticsService.getParentDashboard(studentId);
  }

  @Get('staff')
  @Roles('STAFF', 'ADMIN')
  async getStaffDashboard() {
    return this.analyticsService.getStaffDashboard();
  }

  @Get('admin')
  @Roles('ADMIN')
  async getAdminDashboard() {
    return this.analyticsService.getAdminDashboard();
  }
}
