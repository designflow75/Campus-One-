import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FirebaseService } from '../common/firebase.service';

@Injectable()
export class TransactionService {
  constructor(
    private prisma: PrismaService,
    private firebaseService: FirebaseService,
  ) {}

  async processScan(nfcUid: string, items: { itemId: string; quantity: number }[]) {
    // 1. Student Verification
    const student = await this.prisma.student.findUnique({
      where: { nfcUid },
      include: {
        wallet: true,
        allergies: true,
        restrictions: true,
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            fcmToken: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student card not registered');
    }

    const wallet = student.wallet;
    if (!wallet) {
      throw new NotFoundException('Student wallet not initialized');
    }

    // 2. Fetch Menu Items
    const itemIds = items.map((i) => i.itemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: itemIds } },
    });

    if (menuItems.length !== itemIds.length) {
      throw new BadRequestException('Some items in the cart are invalid');
    }

    const itemsMap = new Map(menuItems.map((item) => [item.id, item]));

    // Calculate total amount and verify items availability
    let totalAmount = 0;
    for (const cartItem of items) {
      const dbItem = itemsMap.get(cartItem.itemId);
      if (!dbItem) {
        throw new BadRequestException(`Item with ID ${cartItem.itemId} not found`);
      }
      if (!dbItem.isAvailable) {
        return this.recordFailedTransaction(
          student.id,
          0,
          `Item "${dbItem.name}" is currently sold out`,
        );
      }
      totalAmount += dbItem.price * cartItem.quantity;
    }

    // 3. Rule Validations
    
    // A. Allergy Restrictions
    const studentAllergies = student.allergies.map((a) => a.allergyName.toLowerCase());
    for (const cartItem of items) {
      const dbItem = itemsMap.get(cartItem.itemId)!;
      const itemAllergens = dbItem.allergenTags
        ? dbItem.allergenTags.split(',').map((t) => t.trim().toLowerCase())
        : [];
      
      for (const allergen of itemAllergens) {
        if (studentAllergies.includes(allergen)) {
          return this.recordFailedTransaction(
            student.id,
            totalAmount,
            `Allergy block: Student is allergic to ${allergen.toUpperCase()} (found in "${dbItem.name}")`,
          );
        }
      }
    }

    // B. Food Restrictions
    for (const cartItem of items) {
      const dbItem = itemsMap.get(cartItem.itemId)!;
      const category = dbItem.category.toLowerCase();
      const tags = dbItem.restrictionTags
        ? dbItem.restrictionTags.split(',').map((t) => t.trim().toLowerCase())
        : [];

      for (const restriction of student.restrictions) {
        if (restriction.type === 'JUNK_FOOD_BLOCK') {
          if (category === 'junk food' || tags.includes('junk')) {
            return this.recordFailedTransaction(
              student.id,
              totalAmount,
              `Diet restriction block: Junk food is blocked for this student (triggered by "${dbItem.name}")`,
            );
          }
        }

        if (restriction.type === 'SOFT_DRINK_BLOCK') {
          if (
            category === 'drinks' ||
            category === 'beverages' ||
            tags.includes('soda') ||
            tags.includes('softdrink') ||
            dbItem.name.toLowerCase().includes('cola') ||
            dbItem.name.toLowerCase().includes('soda')
          ) {
            return this.recordFailedTransaction(
              student.id,
              totalAmount,
              `Diet restriction block: Soft drinks are blocked for this student (triggered by "${dbItem.name}")`,
            );
          }
        }

        if (restriction.type === 'CATEGORY_RESTRICTION') {
          if (restriction.value && category === restriction.value.toLowerCase()) {
            return this.recordFailedTransaction(
              student.id,
              totalAmount,
              `Diet restriction block: Category "${restriction.value}" is blocked for this student`,
            );
          }
        }

        if (restriction.type === 'CUSTOM_ITEM_RESTRICTION') {
          if (restriction.value && dbItem.id === restriction.value) {
            return this.recordFailedTransaction(
              student.id,
              totalAmount,
              `Diet restriction block: "${dbItem.name}" is specifically blocked for this student`,
            );
          }
        }
      }
    }

    // C. Wallet Balance Check
    if (wallet.balance < totalAmount) {
      return this.recordFailedTransaction(
        student.id,
        totalAmount,
        `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${totalAmount.toFixed(2)}`,
      );
    }

    // D. Per Transaction Limit
    if (wallet.perTransactionLimit && totalAmount > wallet.perTransactionLimit) {
      return this.recordFailedTransaction(
        student.id,
        totalAmount,
        `Transaction exceeds the per-transaction limit of ₹${wallet.perTransactionLimit.toFixed(2)}`,
      );
    }

    // E. Daily Spending Limit
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySpendingResult = await this.prisma.transaction.aggregate({
      where: {
        studentId: student.id,
        status: 'SUCCESS',
        timestamp: { gte: startOfToday },
      },
      _sum: { amount: true },
    });
    const todaySpent = todaySpendingResult._sum.amount || 0;

    if (wallet.dailyLimit && todaySpent + totalAmount > wallet.dailyLimit) {
      return this.recordFailedTransaction(
        student.id,
        totalAmount,
        `Transaction exceeds daily spending limit of ₹${wallet.dailyLimit.toFixed(2)} (Spent today: ₹${todaySpent.toFixed(2)}, Cart: ₹${totalAmount.toFixed(2)})`,
      );
    }

    // F. Weekly Spending Limit
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const weekSpendingResult = await this.prisma.transaction.aggregate({
      where: {
        studentId: student.id,
        status: 'SUCCESS',
        timestamp: { gte: startOfWeek },
      },
      _sum: { amount: true },
    });
    const weekSpent = weekSpendingResult._sum.amount || 0;

    if (wallet.weeklyLimit && weekSpent + totalAmount > wallet.weeklyLimit) {
      return this.recordFailedTransaction(
        student.id,
        totalAmount,
        `Transaction exceeds weekly spending limit of ₹${wallet.weeklyLimit.toFixed(2)} (Spent this week: ₹${weekSpent.toFixed(2)})`,
      );
    }

    // G. Monthly Spending Limit
    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    const monthSpendingResult = await this.prisma.transaction.aggregate({
      where: {
        studentId: student.id,
        status: 'SUCCESS',
        timestamp: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });
    const monthSpent = monthSpendingResult._sum.amount || 0;

    if (wallet.monthlyLimit && monthSpent + totalAmount > wallet.monthlyLimit) {
      return this.recordFailedTransaction(
        student.id,
        totalAmount,
        `Transaction exceeds monthly spending limit of ₹${wallet.monthlyLimit.toFixed(2)} (Spent this month: ₹${monthSpent.toFixed(2)})`,
      );
    }

    // 4. Approve Transaction & Deduct Balance
    return this.prisma.$transaction(async (tx) => {
      // Deduct from wallet
      await tx.wallet.update({
        where: { studentId: student.id },
        data: { balance: wallet.balance - totalAmount },
      });

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          studentId: student.id,
          amount: totalAmount,
          status: 'SUCCESS',
          items: {
            create: items.map((cartItem) => {
              const dbItem = itemsMap.get(cartItem.itemId)!;
              return {
                menuItemId: cartItem.itemId,
                quantity: cartItem.quantity,
                price: dbItem.price,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // 5. Send real/simulated FCM Notification
      const title = 'CampusOne Purchase Alert';
      const body = `${student.name} just purchased items totaling ₹${totalAmount.toFixed(2)}.`;
      
      if (student.parent.fcmToken) {
        this.firebaseService.sendNotification(student.parent.fcmToken, title, body)
          .catch(err => console.error('FCM Dispatch error:', err));
      } else {
        const notificationMessage = `[Simulation] FCM Notification: Sent to Parent (${student.parent.email}) - CampusOne Alert: ${student.name} spent ₹${totalAmount.toFixed(2)} on canteen purchases.`;
        console.log(notificationMessage);
      }

      return {
        success: true,
        message: 'Transaction approved',
        transaction,
        notification: {
          recipient: student.parent.email,
          title,
          body,
        },
      };
    });
  }

  private async recordFailedTransaction(studentId: string, amount: number, reason: string) {
    const transaction = await this.prisma.transaction.create({
      data: {
        studentId,
        amount,
        status: 'DECLINED',
        failureReason: reason,
      },
    });

    return {
      success: false,
      message: 'Transaction declined',
      reason,
      transaction,
    };
  }

  async getStudentTransactions(studentId: string) {
    return this.prisma.transaction.findMany({
      where: { studentId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async getRecentTransactions(limit = 10) {
    return this.prisma.transaction.findMany({
      take: limit,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            class: true,
          },
        },
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
