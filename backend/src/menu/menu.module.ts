import { Module } from '@nestjs/common';
import { MenuService } from './menu.service';
import { MenuController } from './menu.controller';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [MenuService, PrismaService],
  controllers: [MenuController],
  exports: [MenuService],
})
export class MenuModule {}
