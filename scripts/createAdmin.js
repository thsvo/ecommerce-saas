const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Function to generate a unique subdomain
async function generateUniqueSubdomain(firstName, lastName) {
  // Create base subdomain from first name and last name
  let baseSubdomain = `${firstName.toLowerCase()}${lastName.toLowerCase()}`;
  
  // Remove special characters and spaces
  baseSubdomain = baseSubdomain.replace(/[^a-z0-9]/g, '');
  
  // Check if the subdomain already exists
  let subdomain = baseSubdomain;
  let counter = 1;
  
  while (true) {
    const existingUser = await prisma.user.findUnique({
      where: { subdomain },
    });
    
    if (!existingUser) {
      return subdomain;
    }
    
    // If subdomain exists, append a number and try again
    subdomain = `${baseSubdomain}${counter}`;
    counter++;
  }
}

async function createAdmin() {
  try {
    // Get command line arguments
    const [firstName, email, password, subdomain] = process.argv.slice(2);
    
    if (!firstName || !email || !password || !subdomain) {
      console.log('Usage: node createAdmin.js <firstName> <email> <password> <subdomain>');
      console.log('Example: node createAdmin.js John john@example.com admin123 johnstore');
      return;
    }

    // Check if admin already exists with this email
    const existingAdmin = await prisma.user.findUnique({
      where: { email }
    });

    if (existingAdmin) {
      console.log('Admin user already exists with email:', email);
      return;
    }

    // Check if subdomain already exists
    const existingSubdomain = await prisma.user.findUnique({
      where: { subdomain }
    });

    if (existingSubdomain) {
      console.log('Subdomain already exists:', subdomain);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName: 'Admin',
        subdomain,
        role: 'ADMIN'
      }
    });

    console.log('Admin user created successfully!');
    console.log('Name:', `${admin.firstName} ${admin.lastName}`);
    console.log('Email:', admin.email);
    console.log('Password:', password);
    console.log('Role:', admin.role);
    console.log('Subdomain:', admin.subdomain);
    console.log(`Access URL: http://${admin.subdomain}.localhost:3000 (for local development)`);
    console.log(`Production URL would be: http://${admin.subdomain}.yourdomain.com`);

  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
