@echo off
REM Script para ver logs de Android filtrados
REM Buscar adb en ubicaciones comunes

set ADB_PATH=

REM Verificar si adb está en el PATH
where adb >nul 2>&1
if %ERRORLEVEL% == 0 (
    set ADB_PATH=adb
    goto :found
)

REM Buscar en ubicación común del SDK
if exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe
    goto :found
)

REM Buscar en ANDROID_HOME
if exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    set ADB_PATH=%ANDROID_HOME%\platform-tools\adb.exe
    goto :found
)

REM Buscar en otras ubicaciones
if exist "C:\Android\Sdk\platform-tools\adb.exe" (
    set ADB_PATH=C:\Android\Sdk\platform-tools\adb.exe
    goto :found
)

echo ❌ No se encontro adb. Asegurate de tener Android SDK instalado.
echo.
echo Alternativa: Usa la consola de Metro (npm start) para ver los logs de JavaScript.
pause
exit /b 1

:found
echo ✅ ADB encontrado: %ADB_PATH%
echo Limpiando logs anteriores...
"%ADB_PATH%" logcat -c

echo.
echo Mostrando logs de la aplicacion (presiona Ctrl+C para detener)...
echo Filtrando: ReactNative, ReactNativeJS, AndroidRuntime, FATAL, LifeSync, AppUsage, ErrorBoundary
echo.

"%ADB_PATH%" logcat | findstr /i "ReactNative ReactNativeJS AndroidRuntime FATAL LifeSync AppUsage ErrorBoundary Error Exception"

