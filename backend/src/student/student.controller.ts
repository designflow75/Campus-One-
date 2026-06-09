import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Post()
  @Roles('ADMIN', 'PARENT')
  async create(@Body() createDto: any, @Request() req: any) {
    if (req.user.role === 'PARENT') {
      createDto.parentId = req.user.userId;
    }
    return this.studentService.create(createDto);
  }

  @Get()
  @Roles('ADMIN', 'STAFF')
  async findAll() {
    return this.studentService.findAll();
  }

  @Get('parent')
  @Roles('PARENT')
  async findByParent(@Request() req: any) {
    return this.studentService.findByParent(req.user.userId);
  }

  @Get('parents')
  @Roles('ADMIN', 'STAFF')
  async findParents() {
    return this.studentService.findParents();
  }

  @Get(':id')
  @Roles('ADMIN', 'PARENT', 'STAFF')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const student = await this.studentService.findOne(id);
    // If user is a parent, ensure they own this student
    if (req.user.role === 'PARENT' && student.parentId !== req.user.userId) {
      throw new ForbiddenException('Access denied to this student record');
    }
    return student;
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.studentService.update(id, updateDto);
  }

  @Patch(':id/nfc')
  @Roles('ADMIN', 'STAFF')
  async assignNfc(@Param('id') id: string, @Body('nfcUid') nfcUid: string) {
    return this.studentService.assignNfc(id, nfcUid);
  }

  @Patch(':id/wallet/limits')
  @Roles('PARENT')
  async updateLimits(
    @Param('id') id: string,
    @Body() limitsDto: any,
    @Request() req: any,
  ) {
    const student = await this.studentService.findOne(id);
    if (student.parentId !== req.user.userId) {
      throw new ForbiddenException('Access denied to this student record');
    }
    return this.studentService.updateLimits(id, limitsDto);
  }

  @Post(':id/wallet/topup')
  @Roles('PARENT', 'ADMIN')
  async topupWallet(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Request() req: any,
  ) {
    const student = await this.studentService.findOne(id);
    if (req.user.role === 'PARENT' && student.parentId !== req.user.userId) {
      throw new ForbiddenException('Access denied to this student record');
    }
    return this.studentService.topupWallet(id, amount);
  }

  @Post(':id/restrictions')
  @Roles('PARENT')
  async updateRestrictions(
    @Param('id') id: string,
    @Body('restrictions') restrictions: string[],
    @Request() req: any,
  ) {
    const student = await this.studentService.findOne(id);
    if (student.parentId !== req.user.userId) {
      throw new ForbiddenException('Access denied to this student record');
    }
    return this.studentService.updateRestrictions(id, restrictions);
  }

  @Post(':id/allergies')
  @Roles('PARENT')
  async updateAllergies(
    @Param('id') id: string,
    @Body('allergies') allergies: string[],
    @Request() req: any,
  ) {
    const student = await this.studentService.findOne(id);
    if (student.parentId !== req.user.userId) {
      throw new ForbiddenException('Access denied to this student record');
    }
    return this.studentService.updateAllergies(id, allergies);
  }
}
