const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany();
    console.log('Available products:');
    products.forEach(p => {
      console.log(`ID: ${p.id}, Name: ${p.name}`);
    });
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkProducts();
