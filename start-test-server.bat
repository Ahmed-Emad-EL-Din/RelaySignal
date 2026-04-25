@echo off
cls
echo ==================================================
echo RelaySignal Local Test Server
echo ==================================================
echo.

echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed! Please install Node.js first.
    pause
    exit /b 1
)

echo.
echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install --no-fund --no-audit

if %errorlevel% neq 0 (
    echo.
    echo WARNING: Some dependencies had issues, trying alternative installation...
    call npm install --force --no-fund --no-audit
)

echo.
echo ==================================================
echo Building for Production
echo ==================================================
echo.

call npm run build

if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed! Check the errors above.
    pause
    exit /b 1
)

echo.
echo ==================================================
echo Build Successful!
echo Starting Production Preview Server
echo Open browser at: http://localhost:4173
echo ==================================================
echo.
echo Press Ctrl+C to stop server
echo.

call npm run preview

pause
