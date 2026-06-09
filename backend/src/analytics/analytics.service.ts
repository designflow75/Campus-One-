import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getParentDashboard(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { wallet: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const startOfMonth = new Date();
    startOfMonth.setDate(startOfMonth.getDate() - 30);

    // 1. Spending Aggregates
    const todaySpending = await this.prisma.transaction.aggregate({
      where: { studentId, status: 'SUCCESS', timestamp: { gte: startOfToday } },
      _sum: { amount: true },
    });

    const weeklySpending = await this.prisma.transaction.aggregate({
      where: { studentId, status: 'SUCCESS', timestamp: { gte: startOfWeek } },
      _sum: { amount: true },
    });

    const monthlySpending = await this.prisma.transaction.aggregate({
      where: { studentId, status: 'SUCCESS', timestamp: { gte: startOfMonth } },
      _sum: { amount: true },
    });

    // 2. Nutrition Aggregates for Today
    const todayTransactions = await this.prisma.transaction.findMany({
      where: { studentId, status: 'SUCCESS', timestamp: { gte: startOfToday } },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
    });

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    for (const tx of todayTransactions) {
      for (const item of tx.items) {
        const menuItem = item.menuItem;
        calories += (menuItem.calories || 0) * item.quantity;
        protein += (menuItem.protein || 0) * item.quantity;
        carbs += (menuItem.carbs || 0) * item.quantity;
        fat += (menuItem.fat || 0) * item.quantity;
      }
    }

    // 3. Recent Purchases
    const recentPurchases = await this.prisma.transaction.findMany({
      where: { studentId, status: 'SUCCESS' },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 5,
    });

    return {
      walletBalance: student.wallet?.balance || 0,
      todaySpending: todaySpending._sum.amount || 0,
      weeklySpending: weeklySpending._sum.amount || 0,
      monthlySpending: monthlySpending._sum.amount || 0,
      nutrition: {
        calories,
        protein,
        carbs,
        fat,
      },
      recentPurchases: recentPurchases.map((tx) => ({
        id: tx.id,
        amount: tx.amount,
        timestamp: tx.timestamp,
        items: tx.items.map((i) => ({
          name: i.menuItem.name,
          quantity: i.quantity,
          price: i.price,
        })),
      })),
    };
  }

  async getStaffDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySuccess = await this.prisma.transaction.aggregate({
      where: { status: 'SUCCESS', timestamp: { gte: startOfToday } },
      _count: { id: true },
      _sum: { amount: true },
    });

    const todayFailed = await this.prisma.transaction.aggregate({
      where: { status: 'DECLINED', timestamp: { gte: startOfToday } },
      _count: { id: true },
    });

    const activeStudentsToday = await this.prisma.transaction.groupBy({
      by: ['studentId'],
      where: { status: 'SUCCESS', timestamp: { gte: startOfToday } },
    });

    const recentScans = await this.prisma.transaction.findMany({
      take: 10,
      include: {
        student: {
          select: {
            name: true,
            class: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    return {
      todayTransactions: todaySuccess._count.id || 0,
      revenueSummary: todaySuccess._sum.amount || 0,
      failedTransactions: todayFailed._count.id || 0,
      activeStudents: activeStudentsToday.length,
      recentScans: recentScans.map((tx) => ({
        id: tx.id,
        studentName: tx.student?.name || 'Unknown',
        studentClass: tx.student?.class || '',
        amount: tx.amount,
        status: tx.status,
        reason: tx.failureReason,
        timestamp: tx.timestamp,
      })),
    };
  }

  async getAdminDashboard() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Counts
    const studentCount = await this.prisma.student.count();
    const staffCount = await this.prisma.user.count({ where: { role: 'STAFF' } });
    const menuCount = await this.prisma.menuItem.count({ where: { isAvailable: true } });

    // Revenue totals
    const totalRevenueResult = await this.prisma.transaction.aggregate({
      where: { status: 'SUCCESS' },
      _sum: { amount: true },
    });
    const totalRevenue = totalRevenueResult._sum.amount || 0;

    // Popular items
    const txItems = await this.prisma.transactionItem.findMany({
      where: { transaction: { status: 'SUCCESS' } },
      include: { menuItem: true },
    });

    const itemSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of txItems) {
      const existing = itemSales.get(item.menuItemId) || { name: item.menuItem.name, quantity: 0, revenue: 0 };
      existing.quantity += item.quantity;
      existing.revenue += item.price * item.quantity;
      itemSales.set(item.menuItemId, existing);
    }

    const popularItems = Array.from(itemSales.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Allergy block reports
    const allergyBlocks = await this.prisma.transaction.findMany({
      where: {
        status: 'DECLINED',
        failureReason: { contains: 'Allergy' },
      },
      select: { failureReason: true, timestamp: true },
    });

    const dietBlocks = await this.prisma.transaction.findMany({
      where: {
        status: 'DECLINED',
        failureReason: { contains: 'restriction' },
      },
      select: { failureReason: true, timestamp: true },
    });

    // Sales charts (mock daily breakdown for last 7 days)
    const salesBreakdown: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);

      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const dayRevenue = await this.prisma.transaction.aggregate({
        where: {
          status: 'SUCCESS',
          timestamp: { gte: d, lte: dEnd },
        },
        _sum: { amount: true },
      });

      salesBreakdown.push({
        date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' }),
        revenue: dayRevenue._sum.amount || 0,
      });
    }

    return {
      metrics: {
        students: studentCount,
        staff: staffCount,
        menuItems: menuCount,
        totalRevenue,
      },
      popularItems,
      allergyBlockCount: allergyBlocks.length,
      dietBlockCount: dietBlocks.length,
      allergyReports: allergyBlocks.map((b) => ({
        reason: b.failureReason,
        timestamp: b.timestamp,
      })),
      dietReports: dietBlocks.map((b) => ({
        reason: b.failureReason,
        timestamp: b.timestamp,
      })),
      salesChart: salesBreakdown,
    };
  }
}
