const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Please provide a username and password.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const superAdmin = await prisma.superAdmin.create({
      data: {
        username,
        password: hashedPassword,
      },
    });
    console.log('Superadmin created successfully:', superAdmin);
  } catch (error) {
    console.error('Error creating superadmin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
