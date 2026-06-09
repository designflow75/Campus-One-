import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Clear existing data
  await prisma.allergy.deleteMany();
  await prisma.restriction.deleteMany();
  await prisma.transactionItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.student.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const parentPassword = await bcrypt.hash('parent123', 10);
  const staffPassword = await bcrypt.hash('staff123', 10);

  const admin = await prisma.user.create({
    data: {
      name: 'School Admin',
      email: 'admin@campusone.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const parent = await prisma.user.create({
    data: {
      name: 'John Mercer',
      email: 'parent@gmail.com',
      password: parentPassword,
      role: 'PARENT',
    },
  });

  const staff = await prisma.user.create({
    data: {
      name: 'Alice Cook',
      email: 'staff@canteen.com',
      password: staffPassword,
      role: 'STAFF',
    },
  });

  console.log('Users created:', { admin: admin.email, parent: parent.email, staff: staff.email });

  // 3. Create Students
  const student = await prisma.student.create({
    data: {
      name: 'Alex Mercer',
      class: 'Grade 5-A',
      nfcUid: '123456789', // Mock UID
      parentId: parent.id,
      wallet: {
        create: {
          balance: 100.0, // Pre-load 100 INR
          dailyLimit: 200.0,
          perTransactionLimit: 150.0,
        },
      },
    },
  });

  console.log('Student created:', student.name, 'with Wallet Balance: ₹100');

  // 4. Create Menu Items
  const menuItems = [
    {
      name: 'French Fries',
      category: 'Junk Food',
      price: 60.0,
      calories: 312,
      protein: 3.4,
      carbs: 41,
      fat: 15,
      allergenTags: '',
      restrictionTags: 'junk',
    },
    {
      name: 'Coca Cola',
      category: 'Drinks',
      price: 40.0,
      calories: 150,
      protein: 0,
      carbs: 39,
      fat: 0,
      allergenTags: '',
      restrictionTags: 'soda',
    },
    {
      name: 'Peanut Butter Sandwich',
      category: 'Snacks',
      price: 80.0,
      calories: 280,
      protein: 9,
      carbs: 32,
      fat: 14,
      allergenTags: 'peanut',
      restrictionTags: '',
    },
    {
      name: 'Veggie Salad',
      category: 'Meals',
      price: 120.0,
      calories: 120,
      protein: 2,
      carbs: 8,
      fat: 4,
      allergenTags: '',
      restrictionTags: '',
    },
    {
      name: 'Chicken Wrap',
      category: 'Meals',
      price: 150.0,
      calories: 380,
      protein: 24,
      carbs: 34,
      fat: 12,
      allergenTags: 'dairy',
      restrictionTags: '',
    },
    {
      name: 'Chocolate Milkshake',
      category: 'Drinks',
      price: 90.0,
      calories: 290,
      protein: 7,
      carbs: 44,
      fat: 9,
      allergenTags: 'dairy',
      restrictionTags: '',
    },
    {
      name: 'Boiled Egg',
      category: 'Breakfast',
      price: 30.0,
      calories: 78,
      protein: 6,
      carbs: 0.6,
      fat: 5,
      allergenTags: 'egg',
      restrictionTags: '',
    },
    {
      name: 'Apple',
      category: 'Fruits',
      price: 25.0,
      calories: 95,
      protein: 0.5,
      carbs: 25,
      fat: 0.3,
      allergenTags: '',
      restrictionTags: '',
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.create({ data: item });
  }

  console.log(`${menuItems.length} menu items created.`);
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
