@echo off
REM Script to install dependencies and run the tenant API test

echo Installing axios dependency if not already installed...
call npm install axios --save

echo.
echo Running tenant API test...
node scripts/test-tenant-api.js

pause