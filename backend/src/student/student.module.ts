import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [StudentService, PrismaService],
  controllers: [StudentController],
  exports: [StudentService],
})
export class StudentModule {}
