#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment process for ecommerce-saas..."

# Pull latest changes
echo "📥 Pulling latest changes from repository..."
git pull

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Build Next.js application
echo "🏗️ Building Next.js application..."
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "⚠️ PM2 is not installed. Installing PM2..."
    npm install -g pm2
fi

# Check if the app is already running in PM2
if pm2 list | grep -q "frontend\|backend"; then
    echo "🔄 Restarting application with PM2..."
    pm2 restart ecosystem.config.js
else
    echo "▶️ Starting application with PM2 for the first time..."
    pm2 start ecosystem.config.js
fi

# Save PM2 configuration
pm2 save

echo "🔄 Restarting server.js with PM2..."
pm2 restart server.js

echo "🔄 Restarting Nginx..."
sudo systemctl restart nginx

echo "✅ Deployment completed successfully!"
echo "🌐 Your application should now be running at:"
echo "   - Frontend: https://codeopx.com"
echo "   - Backend API: https://api.codeopx.com"
echo ""
echo "📝 Check the logs with:"
echo "   - Frontend logs: pm2 logs frontend"
echo "   - Backend logs: pm2 logs backend"
