import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { PrismaService } from '../prisma.service';
import { FirebaseService } from '../common/firebase.service';

@Module({
  providers: [TransactionService, PrismaService, FirebaseService],
  controllers: [TransactionController],
  exports: [TransactionService],
})
export class TransactionModule {}
