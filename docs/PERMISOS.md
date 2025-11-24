# Permisos de la Aplicación LifeSync Games

Este documento detalla todos los permisos que requiere la aplicación y por qué son necesarios.

## Permisos Android

### 1. `HIGH_SAMPLING_RATE_SENSORS`
- **Uso**: Sensor de conteo de pasos (acelerómetro)
- **Requerido desde**: Android 12 (API 31+)
- **Descripción**: Permite acceder a sensores de alta frecuencia como el acelerómetro para detectar pasos con precisión.
- **Cuándo se solicita**: Al activar el sensor de pasos
- **Alternativa**: En versiones anteriores de Android, el acelerómetro está disponible sin este permiso

### 2. `PACKAGE_USAGE_STATS`
- **Uso**: Sensores de sesiones de aplicaciones y uso del teléfono
- **Requerido desde**: Android 5.0 (API 21+)
- **Descripción**: Permite monitorear qué aplicaciones están en uso y durante cuánto tiempo.
- **Cuándo se solicita**: Al activar los sensores de apps o uso del teléfono
- **Nota**: Este permiso NO se puede solicitar programáticamente. El usuario debe otorgarlo manualmente en:
  - Configuración > Aplicaciones > Acceso a datos de uso
  - O Configuración > Ajustes adicionales > Accesibilidad (en Xiaomi/MIUI)

### 3. `BIND_ACCESSIBILITY_SERVICE`
- **Uso**: Alternativa para detectar apps en dispositivos Xiaomi/MIUI
- **Requerido desde**: Android 4.0 (API 14+)
- **Descripción**: Permite usar el servicio de accesibilidad como alternativa para detectar aplicaciones en uso.
- **Cuándo se solicita**: Como alternativa cuando `PACKAGE_USAGE_STATS` no está disponible
- **Nota**: Solo se usa como fallback en dispositivos Xiaomi/MIUI donde el permiso estándar puede no estar disponible

### 4. `INTERNET`
- **Uso**: Conexión con la API del servidor
- **Requerido desde**: Siempre
- **Descripción**: Permite realizar llamadas HTTP/HTTPS para autenticación y sincronización de puntos.
- **Cuándo se solicita**: Automáticamente otorgado (permiso normal)
- **Funcionalidades que lo usan**:
  - Login de usuario
  - Obtención de puntos desde el servidor
  - Sincronización de datos

### 5. `ACCESS_NETWORK_STATE`
- **Uso**: Verificar conectividad a internet
- **Requerido desde**: Siempre
- **Descripción**: Permite verificar si el dispositivo tiene conexión a internet antes de realizar llamadas a la API.
- **Cuándo se solicita**: Automáticamente otorgado (permiso normal)
- **Funcionalidades que lo usan**:
  - Verificación de conexión antes de login
  - Manejo de errores de red

## Permisos iOS

Actualmente, la aplicación no requiere permisos especiales en iOS porque:
- El acelerómetro está disponible sin permisos explícitos
- La detección de apps requiere `ScreenTime` framework que no está disponible en Expo managed workflow
- Las llamadas a la API funcionan sin permisos especiales

## Resumen por Sensor

| Sensor | Permisos Requeridos | Plataforma |
|--------|-------------------|------------|
| Conteo de Pasos | `HIGH_SAMPLING_RATE_SENSORS` | Android 12+ |
| Sesiones de Apps | `PACKAGE_USAGE_STATS` o `BIND_ACCESSIBILITY_SERVICE` | Android |
| Uso del Teléfono | `PACKAGE_USAGE_STATS` o `BIND_ACCESSIBILITY_SERVICE` | Android |
| Contribuciones GitHub | `INTERNET` | Todas |
| Login/API | `INTERNET`, `ACCESS_NETWORK_STATE` | Todas |

## Permisos que NO se usan

La aplicación **NO** requiere los siguientes permisos (y no deben agregarse):
- ❌ `READ_PHONE_STATE` - No leemos estado del teléfono
- ❌ `WRITE_EXTERNAL_STORAGE` - No guardamos archivos externos
- ❌ `READ_EXTERNAL_STORAGE` - No leemos archivos externos
- ❌ `CAMERA` - No usamos la cámara
- ❌ `ACCESS_FINE_LOCATION` - No usamos GPS
- ❌ `ACCESS_COARSE_LOCATION` - No usamos ubicación
- ❌ `RECORD_AUDIO` - No grabamos audio
- ❌ `SEND_SMS` / `READ_SMS` - No enviamos/leemos SMS

## Cómo verificar permisos

Los permisos se verifican automáticamente cuando:
1. El usuario intenta activar un sensor
2. La aplicación verifica la disponibilidad del sensor
3. Se muestra un mensaje si faltan permisos

## Instrucciones para el usuario

Si un permiso no está otorgado, la aplicación mostrará:
- Un mensaje explicativo
- Botones para abrir la configuración
- Instrucciones paso a paso según el tipo de dispositivo

## Notas importantes

1. **Permisos manuales**: `PACKAGE_USAGE_STATS` y `BIND_ACCESSIBILITY_SERVICE` deben otorgarse manualmente por el usuario en la configuración del sistema.

2. **Dispositivos Xiaomi/MIUI**: Pueden requerir configuración adicional:
   - Inicio automático de la app
   - Desactivar optimización de batería
   - Otorgar permisos en múltiples ubicaciones

3. **Privacidad**: Todos los datos se almacenan localmente. Solo se envían puntos al servidor cuando el usuario hace login.

