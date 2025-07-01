const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixProductOwnership() {
  try {
    console.log('Checking for products without createdBy field...');
    
    // Find all products without a createdBy value
    const orphanProducts = await prisma.product.findMany({
      where: {
        createdBy: null
      },
      include: {
        category: true
      }
    });

    console.log(`Found ${orphanProducts.length} products without owner.`);

    if (orphanProducts.length === 0) {
      console.log('All products have owners. No action needed.');
      return;
    }

    // Find all admin users with subdomains
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        subdomain: {
          not: null
        }
      }
    });

    console.log(`Found ${adminUsers.length} admin users with subdomains.`);

    if (adminUsers.length === 0) {
      console.log('No admin users found. Deleting orphan products...');
      
      // If no admins, delete orphan products
      const deleteResult = await prisma.product.deleteMany({
        where: {
          createdBy: null
        }
      });
      
      console.log(`Deleted ${deleteResult.count} orphan products.`);
    } else {
      // Option 1: Assign all orphan products to the first admin
      const firstAdmin = adminUsers[0];
      
      console.log(`Assigning all orphan products to admin: ${firstAdmin.firstName} ${firstAdmin.lastName} (${firstAdmin.subdomain})`);
      
      const updateResult = await prisma.product.updateMany({
        where: {
          createdBy: null
        },
        data: {
          createdBy: firstAdmin.id
        }
      });
      
      console.log(`Updated ${updateResult.count} products.`);
      
      // Also update orphan categories if any
      const orphanCategories = await prisma.category.findMany({
        where: {
          createdBy: null
        }
      });
      
      if (orphanCategories.length > 0) {
        console.log(`Found ${orphanCategories.length} categories without owner. Assigning to ${firstAdmin.firstName}...`);
        
        const categoryUpdateResult = await prisma.category.updateMany({
          where: {
            createdBy: null
          },
          data: {
            createdBy: firstAdmin.id
          }
        });
        
        console.log(`Updated ${categoryUpdateResult.count} categories.`);
      }
    }

    console.log('✅ Product ownership fix completed!');

    // Show summary of products by admin
    console.log('\n--- Product ownership summary ---');
    for (const admin of adminUsers) {
      const productCount = await prisma.product.count({
        where: {
          createdBy: admin.id
        }
      });
      
      const categoryCount = await prisma.category.count({
        where: {
          createdBy: admin.id
        }
      });
      
      console.log(`${admin.firstName} ${admin.lastName} (${admin.subdomain}): ${productCount} products, ${categoryCount} categories`);
    }

  } catch (error) {
    console.error('Error fixing product ownership:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixProductOwnership();
