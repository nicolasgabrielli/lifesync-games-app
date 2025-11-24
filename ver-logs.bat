@echo off
REM Script para ver logs de Android en Windows CMD

REM Buscar adb en ubicaciones comunes
set ADB_PATH=

if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
    goto :found
)

if exist "%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%USERPROFILE%\AppData\Local\Android\Sdk\platform-tools\adb.exe
    goto :found
)

if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    set ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe
    goto :found
)

echo ADB no encontrado. Por favor:
echo 1. Instala Android SDK Platform Tools
echo 2. O agrega la ruta de adb a tu PATH
echo.
echo Ubicaciones comunes:
echo   - %%LOCALAPPDATA%%\Android\Sdk\platform-tools\
echo   - O desde Android Studio: Tools ^> SDK Manager ^> SDK Tools ^> Android SDK Platform-Tools
pause
exit /b 1

:found
echo ADB encontrado en: %ADB_PATH%
echo.
echo Verificando dispositivos conectados...
%ADB_PATH% devices
echo.
echo Mostrando logs de AppAccessibilityService y AppUsage...
echo (Presiona Ctrl+C para detener)
echo.
%ADB_PATH% logcat -c
%ADB_PATH% logcat | findstr /I "AppAccessibilityService AppUsage AppSessions"

