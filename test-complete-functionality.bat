@echo off
title RelaySignal Complete Functionality Test

echo ========================================
echo RelaySignal - Complete Functionality Test
echo ========================================
echo.

REM Check if Node.js is installed
echo Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is installed
echo Checking npm installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: npm is not installed or not in PATH
    echo Please install Node.js (which includes npm) from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if project dependencies are installed
echo Checking project dependencies...
if not exist "node_modules" (
    echo Installing project dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
echo Checking .env configuration...
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please create a .env file with your Firebase configuration.
    echo Example:
    echo VITE_FIREBASE_API_KEY=your_api_key
    echo VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    echo VITE_FIREBASE_PROJECT_ID=your_project_id
    echo VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    echo VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    echo VITE_FIREBASE_APP_ID=your_app_id
    echo.
    echo Press any key to continue anyway...
    pause >nul
)

REM Build the project
echo Building the project...
npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

REM Start the development server in background
echo Starting development server...
start "" http://localhost:3000
start /B npm run dev > server.log 2>&1

REM Wait a moment for server to start
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo Testing Complete!
echo ========================================
echo.
echo The development server should now be running at http://localhost:3000
echo.
echo Test the following features:
echo 1. Admin sign-in/sign-up functionality
echo 2. Account deletion feature in Admin Panel
echo 3. All existing notification features
echo 4. Mobile responsiveness
echo 5. Dark/light mode toggle
echo.
echo Press any key to close this test script...
pause >nul