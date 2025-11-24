# Instrucciones para Compilar la App

## Prerrequisitos

1. **Node.js** instalado (versión 18 o superior)
2. **Java JDK** (versión 17 recomendada)
3. **Android Studio** con:
   - Android SDK instalado
   - Android SDK Platform Tools
   - Un emulador configurado O un dispositivo físico conectado

## Pasos para Compilar

### Opción 1: Usando Expo (Recomendado)

```bash
# 1. Navegar a la carpeta de la app
cd "LifeSync-Games App"

# 2. Instalar dependencias (si no lo has hecho)
npm install

# 3. Compilar y ejecutar en Android
npx expo run:android
```

Este comando:
- Compilará el código nativo (Java/Kotlin)
- Construirá el APK
- Instalará la app en el dispositivo/emulador
- Iniciará Metro bundler

### Opción 2: Compilación Manual con Gradle

Si prefieres compilar manualmente:

```bash
# 1. Navegar a la carpeta de la app
cd "LifeSync-Games App"

# 2. Navegar a la carpeta android
cd android

# 3. Limpiar builds anteriores (opcional)
./gradlew clean

# 4. Compilar el APK de debug
./gradlew assembleDebug

# O compilar e instalar directamente
./gradlew installDebug
```

El APK se generará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Opción 3: Usando Android Studio

1. Abre Android Studio
2. File → Open → Selecciona la carpeta `LifeSync-Games App/android`
3. Espera a que Gradle sincronice
4. Conecta un dispositivo o inicia un emulador
5. Click en el botón "Run" (▶️) o presiona `Shift + F10`

## Solución de Problemas

### Error: "SDK not found"
- Abre Android Studio → SDK Manager
- Instala Android SDK Platform 33 o superior
- Configura la variable de entorno `ANDROID_HOME`

### Error: "Gradle sync failed"
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean
```

### Error: "Module not found"
```bash
# Limpiar cache y reinstalar
rm -rf node_modules
npm install
npx expo start --clear
```

### Si los cambios nativos no se aplican

1. Limpia el build:
```bash
cd android
./gradlew clean
cd ..
```

2. Recompila:
```bash
npx expo run:android
```

## Verificar que los Cambios se Aplicaron

Después de compilar, verifica en los logs:

1. Busca: `"AppUsageModule"` - Debe aparecer "Módulo inicializado"
2. Busca: `"SensorManager"` - Debe aparecer "Servicio global inicializado"
3. Busca: `"AppAccessibilityService"` - Debe aparecer "Service created"

## Notas Importantes

- **Primera compilación**: Puede tardar 5-10 minutos mientras descarga dependencias
- **Compilaciones subsecuentes**: 1-3 minutos normalmente
- **Hot Reload**: Los cambios en JavaScript se aplican sin recompilar, pero los cambios nativos requieren recompilación completa

