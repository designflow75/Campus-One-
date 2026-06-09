import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class StudentService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    // Check if parent exists
    const parent = await this.prisma.user.findUnique({
      where: { id: data.parentId },
    });
    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    return this.prisma.student.create({
      data: {
        name: data.name,
        class: data.class,
        parentId: data.parentId,
        nfcUid: data.nfcUid || null,
        wallet: {
          create: {
            balance: 0.0,
          },
        },
      },
      include: {
        wallet: true,
      },
    });
  }

  async findAll() {
    return this.prisma.student.findMany({
      include: {
        wallet: true,
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: {
        wallet: true,
        restrictions: true,
        allergies: true,
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async findByParent(parentId: string) {
    return this.prisma.student.findMany({
      where: { parentId },
      include: {
        wallet: true,
        restrictions: true,
        allergies: true,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.student.update({
      where: { id },
      data: {
        name: data.name,
        class: data.class,
      },
    });
  }

  async assignNfc(id: string, nfcUid: string) {
    // Ensure UID is not already assigned
    if (nfcUid) {
      const existing = await this.prisma.student.findUnique({
        where: { nfcUid },
      });
      if (existing && existing.id !== id) {
        throw new Error('NFC UID is already linked to another student');
      }
    }
    return this.prisma.student.update({
      where: { id },
      data: { nfcUid: nfcUid || null },
    });
  }

  async updateLimits(studentId: string, limits: any) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { studentId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.update({
      where: { studentId },
      data: {
        dailyLimit: limits.dailyLimit !== undefined ? limits.dailyLimit : wallet.dailyLimit,
        weeklyLimit: limits.weeklyLimit !== undefined ? limits.weeklyLimit : wallet.weeklyLimit,
        monthlyLimit: limits.monthlyLimit !== undefined ? limits.monthlyLimit : wallet.monthlyLimit,
        perTransactionLimit: limits.perTransactionLimit !== undefined ? limits.perTransactionLimit : wallet.perTransactionLimit,
      },
    });
  }

  async topupWallet(studentId: string, amount: number) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { studentId },
    });
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return this.prisma.wallet.update({
      where: { studentId },
      data: {
        balance: wallet.balance + amount,
      },
    });
  }

  async updateRestrictions(studentId: string, restrictions: string[]) {
    // Clear old restrictions
    await this.prisma.restriction.deleteMany({
      where: { studentId },
    });

    // Create new ones
    if (restrictions && restrictions.length > 0) {
      await this.prisma.restriction.createMany({
        data: restrictions.map((r) => {
          // Format r can be a block type (e.g. JUNK_FOOD_BLOCK)
          // or a category (e.g. CATEGORY_RESTRICTION:Soda)
          if (r.startsWith('CATEGORY_RESTRICTION:')) {
            return {
              studentId,
              type: 'CATEGORY_RESTRICTION',
              value: r.split(':')[1],
            };
          }
          if (r.startsWith('CUSTOM_ITEM_RESTRICTION:')) {
            return {
              studentId,
              type: 'CUSTOM_ITEM_RESTRICTION',
              value: r.split(':')[1],
            };
          }
          return {
            studentId,
            type: r,
          };
        }),
      });
    }

    return this.prisma.restriction.findMany({
      where: { studentId },
    });
  }

  async updateAllergies(studentId: string, allergies: string[]) {
    // Clear old allergies
    await this.prisma.allergy.deleteMany({
      where: { studentId },
    });

    // Create new ones
    if (allergies && allergies.length > 0) {
      await this.prisma.allergy.createMany({
        data: allergies.map((a) => ({
          studentId,
          allergyName: a.toUpperCase(),
        })),
      });
    }

    return this.prisma.allergy.findMany({
      where: { studentId },
    });
  }

  async findByNfcUid(nfcUid: string) {
    const student = await this.prisma.student.findUnique({
      where: { nfcUid },
      include: {
        wallet: true,
        restrictions: true,
        allergies: true,
      },
    });
    if (!student) {
      throw new NotFoundException('Student card not registered');
    }
    return student;
  }

  async findParents() {
    return this.prisma.user.findMany({
      where: { role: 'PARENT' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  }
}
