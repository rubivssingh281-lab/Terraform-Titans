@echo off
title Echolytix - Production Server
echo ===================================================
echo   Starting Echolytix (Production Server)
echo ===================================================
echo.
if not exist "dist\server.cjs" (
    echo [INFO] Building production bundle first...
    call npm run build
)
echo Application will be available at: http://localhost:3000
echo.
node dist\server.cjs
pause
