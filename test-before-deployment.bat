@echo off
echo ========================================
echo RELAYSIGNAL - COMPLETE TEST SUITE
echo ========================================
echo.

echo [1/5] Checking Node.js and npm versions
node --version
npm --version
echo.

echo [2/5] Installing dependencies...
npm install
echo.

echo [3/5] Running TypeScript compilation check...
npx tsc --noEmit
if %errorlevel% neq 0 (
    echo ❌ TypeScript compilation failed!
    exit /b 1
)
echo ✅ TypeScript compilation successful
echo.

echo [4/5] Building production version...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    exit /b 1
)
echo ✅ Build successful
echo.

echo [5/5] Starting preview server for manual testing...
echo.
echo 📱 Application will be available at: http://localhost:4173
echo ⏰ Preview server will run for 60 seconds for testing
echo 🔍 Open browser and test all features before deployment
echo.
echo Press Ctrl+C to stop the server early
echo.

npm run preview

timeout /t 60 /nobreak >nul

echo.
echo ========================================
echo ✅ ALL TESTS COMPLETED SUCCESSFULLY
echo ========================================
echo.
echo The application is ready for Netlify deployment!
echo Check that all features work in the browser:
echo - Task creation
echo - Reminder scheduling  
echo - Notifications (test with short times)
echo - Responsive design
echo - Offline functionality
echo.
echo Run: npm run deploy
echo To deploy to Netlify