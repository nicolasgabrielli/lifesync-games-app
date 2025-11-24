# Script para ver logs de Android en Windows PowerShell

# Buscar adb en ubicaciones comunes
$adbPaths = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
    "$env:USERPROFILE\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk\platform-tools\adb.exe",
    "$env:ANDROID_HOME\platform-tools\adb.exe"
)

$adbPath = $null
foreach ($path in $adbPaths) {
    if (Test-Path $path) {
        $adbPath = $path
        Write-Host "✅ ADB encontrado en: $path"
        break
    }
}

if (-not $adbPath) {
    Write-Host "❌ ADB no encontrado. Por favor:"
    Write-Host "1. Instala Android SDK Platform Tools"
    Write-Host "2. O agrega la ruta de adb a tu PATH"
    Write-Host ""
    Write-Host "Ubicaciones comunes:"
    Write-Host "  - %LOCALAPPDATA%\Android\Sdk\platform-tools\"
    Write-Host "  - O desde Android Studio: Tools > SDK Manager > SDK Tools > Android SDK Platform-Tools"
    exit 1
}

Write-Host ""
Write-Host "📱 Verificando dispositivos conectados..."
& $adbPath devices

Write-Host ""
Write-Host "📋 Mostrando logs de AppAccessibilityService y AppUsage..."
Write-Host "   (Presiona Ctrl+C para detener)"
Write-Host ""

& $adbPath logcat -c  # Limpiar logs anteriores
& $adbPath logcat | Select-String -Pattern "(AppAccessibilityService|AppUsage|AppSessions)" -CaseSensitive:$false

