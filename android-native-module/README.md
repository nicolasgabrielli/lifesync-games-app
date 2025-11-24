# Módulo Nativo para Detección de Aplicaciones

Este directorio contiene la implementación del módulo nativo de Android necesario para la detección real de aplicaciones.

## Requisitos

1. **expo-dev-client** instalado
2. Ejecutar `npx expo prebuild` para generar las carpetas nativas
3. Compilar con `npx expo run:android`

## Estructura de Archivos

Después de ejecutar `npx expo prebuild`, necesitarás crear estos archivos:

```
android/app/src/main/java/com/lifesync/games/
├── AppUsageModule.java          # Módulo React Native
├── AppUsagePackage.java          # Package para registrar el módulo
└── AppAccessibilityService.java  # Servicio de accesibilidad

android/app/src/main/res/xml/
└── accessibility_service_config.xml  # Configuración del servicio

android/app/src/main/res/values/
└── strings.xml                   # Strings (descripción del servicio)
```

## Instrucciones de Instalación

### Paso 1: Prebuild

```bash
cd "LifeSync-Games App"
npx expo prebuild
```

### Paso 2: Crear los archivos nativos

Copia los archivos de este directorio a las ubicaciones correspondientes en `android/`.

### Paso 3: Compilar

```bash
npx expo run:android
```

## Uso

Una vez compilado, el módulo nativo estará disponible y la detección real funcionará automáticamente cuando el usuario habilite el servicio de accesibilidad.

