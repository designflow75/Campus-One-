import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.menuItem.create({
      data: {
        name: data.name,
        category: data.category,
        price: Number(data.price),
        calories: Number(data.calories || 0),
        protein: Number(data.protein || 0),
        carbs: Number(data.carbs || 0),
        fat: Number(data.fat || 0),
        allergenTags: Array.isArray(data.allergenTags)
          ? data.allergenTags.join(',')
          : data.allergenTags || '',
        restrictionTags: Array.isArray(data.restrictionTags)
          ? data.restrictionTags.join(',')
          : data.restrictionTags || '',
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : true,
      },
    });
  }

  async findAll() {
    return this.prisma.menuItem.findMany();
  }

  async findOne(id: string) {
    const item = await this.prisma.menuItem.findUnique({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Menu item not found');
    }
    return item;
  }

  async update(id: string, data: any) {
    return this.prisma.menuItem.update({
      where: { id },
      data: {
        name: data.name,
        category: data.category,
        price: data.price !== undefined ? Number(data.price) : undefined,
        calories: data.calories !== undefined ? Number(data.calories) : undefined,
        protein: data.protein !== undefined ? Number(data.protein) : undefined,
        carbs: data.carbs !== undefined ? Number(data.carbs) : undefined,
        fat: data.fat !== undefined ? Number(data.fat) : undefined,
        allergenTags: Array.isArray(data.allergenTags)
          ? data.allergenTags.join(',')
          : data.allergenTags !== undefined
            ? data.allergenTags
            : undefined,
        restrictionTags: Array.isArray(data.restrictionTags)
          ? data.restrictionTags.join(',')
          : data.restrictionTags !== undefined
            ? data.restrictionTags
            : undefined,
        isAvailable: data.isAvailable !== undefined ? data.isAvailable : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }
}
