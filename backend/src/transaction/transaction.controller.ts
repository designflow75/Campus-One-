import { Controller, Post, Get, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('scan')
  @Roles('STAFF', 'ADMIN')
  async processScan(@Body() scanDto: { nfcUid: string; items: { itemId: string; quantity: number }[] }) {
    return this.transactionService.processScan(scanDto.nfcUid, scanDto.items);
  }

  @Get('student/:studentId')
  @Roles('PARENT', 'ADMIN', 'STAFF')
  async getStudentTransactions(@Param('studentId') studentId: string, @Request() req: any) {
    // Parent checks
    if (req.user.role === 'PARENT') {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student || student.parentId !== req.user.userId) {
        throw new ForbiddenException('Access denied to this student record');
      }
    }
    return this.transactionService.getStudentTransactions(studentId);
  }

  @Get('recent')
  @Roles('STAFF', 'ADMIN')
  async getRecentTransactions() {
    return this.transactionService.getRecentTransactions(20);
  }
}
