const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function listAdmins() {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        subdomain: true,
        createdAt: true
      }
    });

    console.log('Existing admin users:');
    console.log(JSON.stringify(admins, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAdmins();
