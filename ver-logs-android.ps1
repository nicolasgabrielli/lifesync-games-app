# Script para ver logs de Android filtrados
# Uso: .\ver-logs-android.ps1

# Intentar encontrar adb en diferentes ubicaciones
$adbPath = $null

# 1. Verificar si está en el PATH
try {
    $null = Get-Command adb -ErrorAction Stop
    $adbPath = "adb"
} catch {
    # 2. Buscar en la ubicación común del SDK
    $sdkPath = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
    if (Test-Path $sdkPath) {
        $adbPath = $sdkPath
    } else {
        # 3. Buscar en otras ubicaciones comunes
        $commonPaths = @(
            "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
            "$env:ANDROID_HOME\platform-tools\adb.exe",
            "C:\Android\Sdk\platform-tools\adb.exe"
        )
        
        foreach ($path in $commonPaths) {
            if (Test-Path $path) {
                $adbPath = $path
                break
            }
        }
    }
}

if (-not $adbPath) {
    Write-Host "❌ No se encontró adb. Asegúrate de tener Android SDK instalado." -ForegroundColor Red
    Write-Host "Ubicaciones buscadas:" -ForegroundColor Yellow
    Write-Host "  - $env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" -ForegroundColor Gray
    Write-Host "  - $env:ANDROID_HOME\platform-tools\adb.exe" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Alternativa: Usa la consola de Metro (npm start) para ver los logs de JavaScript." -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ ADB encontrado en: $adbPath" -ForegroundColor Green
Write-Host "Limpiando logs anteriores..." -ForegroundColor Yellow
& $adbPath logcat -c

Write-Host ""
Write-Host "Mostrando logs de la aplicación (presiona Ctrl+C para detener)..." -ForegroundColor Green
Write-Host "Filtrando: ReactNative, ReactNativeJS, AndroidRuntime, FATAL, LifeSync, AppUsage, ErrorBoundary" -ForegroundColor Cyan
Write-Host ""

& $adbPath logcat | Select-String -Pattern "ReactNative|ReactNativeJS|AndroidRuntime|FATAL|LifeSync|AppUsage|ErrorBoundary|Error|Exception" -CaseSensitive:$false

