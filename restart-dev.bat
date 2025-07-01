@echo off
echo Restarting development server to resolve Prisma client issues...
echo.
echo Step 1: Stopping any running processes...
taskkill /f /im node.exe 2>nul
taskkill /f /im "next-router-worker.exe" 2>nul
timeout /t 2 /nobreak > nul

echo Step 2: Generating Prisma client...
npx prisma generate
timeout /t 2 /nobreak > nul

echo Step 3: Starting development server...
npm run dev

pause
