#!/bin/bash

echo "🚀 Deploying WhatsApp Business API to Vercel..."
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔧 Generating Prisma client..."
npx prisma generate

echo "🏗️  Building application..."
npm run build

echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update your webhook URL in Meta Developers Console"
echo "2. Test the webhook using the admin panel"
echo "3. Send a test WhatsApp message"
echo ""
echo "🔗 Your webhook URL will be: https://your-app-name.vercel.app/api/webhooks/whatsapp"
echo "🔑 Verify token: whatsapp_webhook_verify_anjum_2025_secure_token_xyz789"
