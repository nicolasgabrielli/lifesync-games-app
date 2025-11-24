# LifeSync Games App

Una aplicación móvil desarrollada con React Native y Expo que monitorea diferentes aspectos de tu vida diaria y te recompensa con puntos por mantener hábitos saludables y productivos.

## 🚀 Características

### Sensores Disponibles

1. **📱 Sensor de Sesiones de Aplicaciones Móviles**
   - Monitorea tu uso responsable de aplicaciones móviles
   - Gana puntos por mantener un equilibrio saludable entre el tiempo de uso y momentos de desconexión

2. **⏰ Sensor de Horario de Uso del Celular**
   - Rastrea tus patrones de uso del celular para promover hábitos saludables
   - Obtén puntos por respetar horarios de descanso y evitar el uso excesivo

3. **👟 Sensor de Conteo de Pasos Diarios**
   - Fomenta la actividad física diaria
   - Gana puntos por cada paso que des, ayudándote a mantener un estilo de vida activo

4. **💻 Sensor de Contribuciones de GitHub**
   - Promueve el aprendizaje continuo y la productividad
   - Obtén puntos por tus contribuciones en proyectos de código

### Funcionalidades Principales

- **Sistema de Autenticación**: Inicio de sesión seguro con API backend
- **Sistema de Puntos**: Acumula puntos por cada sensor activo
- **Monitoreo en Tiempo Real**: Visualiza datos de sensores actualizados
- **Módulo Nativo Android**: Detección avanzada de uso de aplicaciones mediante servicios de accesibilidad
- **Almacenamiento Local**: Persistencia de datos con AsyncStorage
- **Navegación Intuitiva**: Interfaz con navegación por pestañas y stacks

## 📋 Requisitos Previos

- **Node.js versión 20.19.4 o superior** (SDK 54 requiere Node.js 20+)
  - ⚠️ **Importante**: Si tienes Node.js 18.16.1 o anterior, actualiza a Node.js 20+
  - Puedes descargarlo desde [nodejs.org](https://nodejs.org/)
- **npm** o **yarn**
- **Expo CLI** instalado globalmente
- **Java JDK 17** (para compilación Android)
- **Android Studio** con Android SDK (para compilación nativa)
- Dispositivo móvil Android con permisos de accesibilidad o emulador iOS/Android

## 🔧 Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <url-del-repositorio>
   cd "LifeSync-Games App"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Instalar Expo CLI globalmente (si no lo tienes):**
   ```bash
   npm install -g expo-cli
   ```

## 🏃 Ejecutar la Aplicación

### Opción 1: Usando Expo Go (Solo para desarrollo JavaScript)

⚠️ **Limitación**: Los módulos nativos (como detección de uso de apps) no funcionarán en Expo Go. Para funcionalidad completa, usa la compilación nativa.

1. **Iniciar el servidor de desarrollo:**
   ```bash
   npm start
   ```
   o
   ```bash
   expo start
   ```

2. **Escanear el código QR:**
   - En iOS: Usa la app Cámara
   - En Android: Usa la app Expo Go

### Opción 2: Compilación Nativa (Recomendado para funcionalidad completa)

Para usar todas las funcionalidades, especialmente el módulo nativo de detección de uso de apps:

```bash
# Compilar y ejecutar en Android
npm run android
# o
npx expo run:android
```

Para más detalles sobre la compilación, consulta [COMPILAR.md](./COMPILAR.md)

### Opción 3: Emulador

- **Para Android:**
  ```bash
  npm run android
  ```

- **Para iOS (solo macOS):**
  ```bash
  npm run ios
  ```

## 📱 Configuración de Permisos

### Android

La aplicación requiere los siguientes permisos:

1. **Permiso de Accesibilidad** (para detección de uso de apps):
   - Ve a Configuración → Accesibilidad
   - Activa "LifeSync Games App"
   - Este permiso es necesario para monitorear el uso de aplicaciones

2. **Permiso de Actividad Física** (para contador de pasos):
   - Se solicita automáticamente al activar el sensor de pasos

3. **Permiso de Internet** (para sincronización con API):
   - Se solicita automáticamente

Para más información sobre permisos, consulta [docs/PERMISOS.md](./docs/PERMISOS.md)

## 🛠️ Tecnologías Utilizadas

- **React Native**: Framework para desarrollo móvil multiplataforma
- **Expo**: Plataforma y herramientas para React Native
- **React Navigation**: Navegación entre pantallas
- **React Native Paper**: Componentes de UI Material Design
- **AsyncStorage**: Almacenamiento local persistente
- **Módulos Nativos Android**: Detección de uso de aplicaciones mediante servicios de accesibilidad
- **Expo Sensors**: Acceso a sensores del dispositivo (pasos, etc.)

## 📦 Estructura del Proyecto

```
LifeSync-Games App/
├── App.js                    # Componente principal y navegación
├── package.json              # Dependencias del proyecto
├── app.json                  # Configuración de Expo
├── babel.config.js           # Configuración de Babel
├── metro.config.js           # Configuración de Metro bundler
│
├── android/                  # Código nativo Android
│   ├── app/
│   │   └── src/main/java/    # Módulos nativos Kotlin
│   └── build.gradle           # Configuración de Gradle
│
├── android-native-module/     # Módulo nativo de detección de apps
│   ├── AppAccessibilityService.java
│   ├── AppUsageModule.java
│   └── AppUsagePackage.java
│
├── components/                # Componentes reutilizables
│   ├── AppHistorySummary.js
│   ├── PointCard.js
│   ├── SensorCard.js
│   └── SensorDataDisplay.js
│
├── config/                    # Configuraciones
│   └── sensors.js            # Configuración de sensores
│
├── context/                   # Context API
│   └── AuthContext.js        # Contexto de autenticación
│
├── hooks/                     # Custom hooks
│   └── useSensor.js           # Hook para manejo de sensores
│
├── screens/                   # Pantallas de la aplicación
│   ├── HomeScreen.js         # Pantalla principal con puntos
│   ├── LoginScreen.js        # Pantalla de inicio de sesión
│   ├── SensorDetailScreen.js # Detalle de un sensor
│   └── SensorsScreen.js      # Lista de sensores
│
├── sensors/                   # Implementación de sensores
│   ├── AppSessionsSensor.js
│   ├── GithubContributionsSensor.js
│   ├── PhoneUsageSensor.js
│   ├── StepCounterSensor.js
│   └── index.js
│
├── services/                  # Servicios y lógica de negocio
│   ├── api.js                # Cliente API
│   ├── appUsageDetection.js  # Detección de uso de apps
│   ├── githubService.js      # Servicio de GitHub
│   ├── sensorManager.js      # Gestor de sensores
│   ├── sensorPermissions.js  # Gestión de permisos
│   └── sensorStorage.js      # Almacenamiento de datos
│
└── docs/                      # Documentación adicional
    ├── AGREGAR_SENSORES.md
    └── PERMISOS.md
```

## 🔮 Agregar Nuevos Sensores

Para agregar un nuevo sensor a la aplicación:

1. Agrega la configuración en `config/sensors.js`
2. Crea el archivo del sensor en `sensors/`
3. Implementa la lógica de detección y puntos
4. Exporta el sensor en `sensors/index.js`

Para más detalles, consulta [docs/AGREGAR_SENSORES.md](./docs/AGREGAR_SENSORES.md)

## 🐛 Solución de Problemas

### Error: "runtime not ready, exception in hostObject::get for prop 'reanimatedmodule'"

Este error ocurre cuando `react-native-reanimated` no se inicializa correctamente.

**Solución:**
1. **Cierra completamente Expo Go** en tu teléfono
2. **Detén el servidor** (Ctrl+C en la terminal)
3. **Limpia la caché y reinicia:**
   ```bash
   npm run start:clear
   ```
4. **Reabre Expo Go** y escanea el código QR nuevamente
5. Si persiste, elimina la caché de Expo Go en tu teléfono (configuración de la app)

### Error: "URL.canParse is not a function"

Este error ocurre si tienes Node.js 18.16.1 o anterior. **SDK 54 requiere Node.js 20.19.4 o superior**.

**Solución:**
1. Actualiza Node.js a la versión 20 LTS o superior desde [nodejs.org](https://nodejs.org/)
2. Reinicia tu terminal después de instalar
3. Verifica la versión: `node --version` (debe ser 20.x o superior)

### Error: "failed to download remote update"

Si ves este error, prueba estas soluciones en orden:

1. **Usar modo túnel (Recomendado):**
   ```bash
   npm run start:tunnel
   ```
   Esto funciona mejor cuando hay problemas de red o firewall.

2. **Limpiar caché y reiniciar:**
   ```bash
   npm run start:clear
   ```

3. **Verificar conexión:**
   - Asegúrate de que tu PC y teléfono estén en la misma red WiFi
   - Si no funciona, usa el modo túnel (paso 1)

4. **Reinstalar Expo Go:**
   - Desinstala y reinstala Expo Go en tu teléfono
   - Asegúrate de tener la última versión

### El módulo nativo no funciona

Si el módulo de detección de uso de apps no funciona:

1. **Verifica que hayas compilado la versión nativa:**
   ```bash
   npm run android
   ```
   (No uses Expo Go para módulos nativos)

2. **Verifica los permisos de accesibilidad:**
   - Ve a Configuración → Accesibilidad
   - Asegúrate de que "LifeSync Games App" esté activado

3. **Revisa los logs:**
   ```bash
   # En Windows
   .\ver-logs.bat
   # o
   .\ver-logs.ps1
   ```

4. **Recompila desde cero:**
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npx expo run:android
   ```

### Otros problemas:

1. Asegúrate de tener la última versión de Expo Go (si usas Expo Go)
2. Limpia la caché: `npm run start:clear`
3. Reinstala las dependencias: `rm -rf node_modules && npm install`
4. Si los sensores no funcionan, verifica que tu dispositivo los tenga disponibles
5. Para problemas de compilación, consulta [COMPILAR.md](./COMPILAR.md)

## 📝 Notas Importantes

- **Módulos Nativos**: Los módulos nativos (como detección de uso de apps) solo funcionan en compilaciones nativas, no en Expo Go
- **Permisos**: La aplicación requiere permisos específicos para funcionar correctamente
- **Rendimiento**: El rendimiento puede variar según el dispositivo
- **API Backend**: La aplicación se conecta a un backend API para sincronización de datos y autenticación

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.
