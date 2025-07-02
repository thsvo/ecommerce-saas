@echo off
echo 🚀 Starting deployment process for ecommerce-saas...

:: Pull latest changes
echo 📥 Pulling latest changes from repository...
git pull

:: Install dependencies
echo 📦 Installing dependencies...
npm install

:: Generate Prisma client
echo 🔄 Generating Prisma client...
npx prisma generate

:: Build Next.js application
echo 🏗️ Building Next.js application...
npm run build

:: Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ⚠️ PM2 is not installed. Installing PM2...
    npm install -g pm2
)

:: Check if the app is already running in PM2
pm2 list | findstr "frontend\|backend" >nul
if %ERRORLEVEL% equ 0 (
    echo 🔄 Restarting application with PM2...
    pm2 restart ecosystem.config.js
) else (
    echo ▶️ Starting application with PM2 for the first time...
    pm2 start ecosystem.config.js
)

:: Save PM2 configuration
pm2 save

echo ✅ Deployment completed successfully!
echo 🌐 Your application should now be running at:
echo    - Frontend: https://codeopx.com
echo    - Backend API: https://api.codeopx.com
echo.
echo 📝 Check the logs with:
echo    - Frontend logs: pm2 logs frontend
echo    - Backend logs: pm2 logs backend

pause