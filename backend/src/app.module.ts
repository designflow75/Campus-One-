import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { StudentModule } from './student/student.module';
import { MenuModule } from './menu/menu.module';
import { TransactionModule } from './transaction/transaction.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaService } from './prisma.service';

import { AppController } from './app.controller';

@Module({
  imports: [
    AuthModule,
    StudentModule,
    MenuModule,
    TransactionModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
