const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function setupSMSCampaignDemo() {
  try {
    console.log('🚀 Setting up SMS Campaign demo data...');

    // Create demo admin user if not exists
    const adminEmail = 'admin@sms-demo.com';
    let adminUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          firstName: 'SMS',
          lastName: 'Admin',
          role: 'ADMIN',
          phone: '01712345678'
        }
      });
      console.log('✅ Demo admin user created:', adminEmail);
    }

    // Create demo SMS campaigns
    const demoCampaigns = [
      {
        name: 'Welcome Campaign',
        message: 'Welcome to our ecommerce store! Get 20% off on your first order with code WELCOME20. Visit our website to explore amazing products!',
        recipients: ['01712345678', '01987654321', '01555666777'],
        status: 'DRAFT',
        totalCount: 3,
        createdBy: adminUser.id
      },
      {
        name: 'Flash Sale Alert',
        message: 'FLASH SALE ALERT! 🔥 50% OFF on Electronics for the next 24 hours only! Hurry up, limited stock available. Shop now!',
        recipients: ['01711111111', '01722222222', '01733333333', '01744444444'],
        status: 'SENT',
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        totalCount: 4,
        deliveredCount: 3,
        failedCount: 1,
        failedNumbers: ['01744444444'],
        apiProvider: 'SMS_BANGLADESH',
        createdBy: adminUser.id
      },
      {
        name: 'Order Confirmation',
        message: 'Thank you for your order! Your order #ORD123 has been confirmed and will be delivered within 3-5 business days. Track your order on our website.',
        recipients: ['01700000000'],
        status: 'SENT',
        sentAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        totalCount: 1,
        deliveredCount: 1,
        failedCount: 0,
        apiProvider: 'SMS_BANGLADESH',
        createdBy: adminUser.id
      },
      {
        name: 'Weekend Sale Announcement',
        message: 'Weekend Special! 🎉 Get up to 70% off on Fashion & Accessories. Free delivery on orders above ৳1000. Sale starts Friday 6 PM!',
        recipients: ['01811111111', '01822222222', '01833333333'],
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        totalCount: 3,
        createdBy: adminUser.id
      }
    ];

    for (const campaign of demoCampaigns) {
      const existing = await prisma.sMSCampaign.findFirst({
        where: { name: campaign.name }
      });

      if (!existing) {
        const created = await prisma.sMSCampaign.create({
          data: campaign
        });

        // Create some demo logs
        await prisma.sMSCampaignLog.create({
          data: {
            campaignId: created.id,
            action: 'CREATED',
            details: {
              message: 'Campaign created successfully',
              recipientCount: campaign.totalCount
            },
            userId: adminUser.id
          }
        });

        if (campaign.status === 'SENT') {
          await prisma.sMSCampaignLog.create({
            data: {
              campaignId: created.id,
              action: 'SENT',
              details: {
                message: 'Campaign sent via SMS Bangladesh API',
                deliveredCount: campaign.deliveredCount,
                failedCount: campaign.failedCount,
                apiProvider: 'SMS_BANGLADESH'
              },
              userId: adminUser.id
            }
          });
        }

        console.log(`✅ Demo campaign created: ${campaign.name}`);
      }
    }

    console.log('\n🎉 SMS Campaign demo setup completed!');
    console.log('\nDemo Data Created:');
    console.log('📧 Admin Email:', adminEmail);
    console.log('🔑 Admin Password: admin123');
    console.log('📱 Demo Campaigns: 4 campaigns with different statuses');
    console.log('\nNext Steps:');
    console.log('1. Add your SMS Bangladesh API credentials to .env file');
    console.log('2. Start the development server: npm run dev');
    console.log('3. Visit /admin/sms-campaign to manage campaigns');
    console.log('4. Login with the demo admin credentials');

  } catch (error) {
    console.error('❌ Error setting up SMS Campaign demo:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupSMSCampaignDemo();
