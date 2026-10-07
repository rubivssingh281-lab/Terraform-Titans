@echo off
setlocal

echo ========================================================
echo   Echolytix Hand Sign Gesture Automation Test Runner
echo ========================================================

REM Look for Maven on PATH or check IntelliJ bundled Maven
where mvn >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set MVN_CMD=mvn
) else (
    if exist "C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.1\plugins\maven-plugin\lib\maven3\bin\mvn.cmd" (
        set "MVN_CMD=C:\Program Files\JetBrains\IntelliJ IDEA 2026.2.1\plugins\maven-plugin\lib\maven3\bin\mvn.cmd"
    ) else (
        echo [ERROR] Maven not found on PATH or in default IntelliJ directory.
        echo Please ensure Maven is installed or run directly from IntelliJ / Eclipse.
        pause
        exit /b 1
    )
)

echo [INFO] Using Maven: %MVN_CMD%
echo [INFO] Running Selenium Java Hand Sign Gesture Test Suite...
"%MVN_CMD%" clean test

echo.
echo ========================================================
echo   Test Execution Complete. Check target/surefire-reports
echo ========================================================
pause
