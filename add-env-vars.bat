@echo off
echo Adding WhatsApp environment variables to Vercel...
echo.

echo Adding WHATSAPP_ACCESS_TOKEN...
vercel env add WHATSAPP_ACCESS_TOKEN production
echo.

echo Adding WHATSAPP_PHONE_NUMBER_ID...
vercel env add WHATSAPP_PHONE_NUMBER_ID production
echo.

echo Adding WHATSAPP_BUSINESS_ACCOUNT_ID...
vercel env add WHATSAPP_BUSINESS_ACCOUNT_ID production
echo.

echo Adding WHATSAPP_WEBHOOK_VERIFY_TOKEN...
vercel env add WHATSAPP_WEBHOOK_VERIFY_TOKEN production
echo.

echo Adding WHATSAPP_WEBHOOK_SECRET...
vercel env add WHATSAPP_WEBHOOK_SECRET production
echo.

echo Adding WHATSAPP_API_VERSION...
vercel env add WHATSAPP_API_VERSION production
echo.

echo All environment variables added!
echo Now run: vercel --prod
echo.
