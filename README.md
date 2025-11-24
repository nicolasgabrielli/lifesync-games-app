# LifeSync Games App

Una aplicación móvil desarrollada con React Native y Expo que permite acceder y visualizar datos de los sensores del teléfono en tiempo real.

## 🚀 Características

- **Acelerómetro**: Mide la aceleración del dispositivo en los ejes X, Y, Z
- **Giroscopio**: Mide la velocidad angular y rotación del dispositivo
- **Magnetómetro**: Mide el campo magnético (brújula digital)

Todos los sensores se actualizan en tiempo real (60 FPS) y muestran tanto los valores individuales como la magnitud del vector.

## 📋 Requisitos Previos

- **Node.js versión 20.19.4 o superior** (SDK 54 requiere Node.js 20+)
  - ⚠️ **Importante**: Si tienes Node.js 18.16.1 o anterior, actualiza a Node.js 20+
  - Puedes descargarlo desde [nodejs.org](https://nodejs.org/)
- npm o yarn
- Expo CLI instalado globalmente
- Dispositivo móvil con Expo Go o emulador iOS/Android

## 🔧 Instalación

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Instalar Expo CLI globalmente (si no lo tienes):**
   ```bash
   npm install -g expo-cli
   ```

## 🏃 Ejecutar la Aplicación

### Opción 1: Usando Expo Go (Recomendado para desarrollo)

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

### Opción 2: Emulador

- **Para Android:**
  ```bash
   npm run android
   ```

- **Para iOS (solo macOS):**
  ```bash
   npm run ios
   ```

- **Para Web (Interfaz únicamente - los sensores no funcionan):**
  ```bash
   npm run web
   ```
  
  ⚠️ **Nota**: La versión web muestra la interfaz pero los sensores no funcionarán ya que requieren hardware del dispositivo móvil.

## 📱 Uso

1. Abre la aplicación en tu dispositivo móvil
2. Los sensores comenzarán a leer datos automáticamente
3. Mueve tu dispositivo para ver los cambios en tiempo real
4. Cada sensor muestra:
   - Valores individuales en los ejes X, Y, Z
   - La magnitud del vector resultante

## 🛠️ Tecnologías Utilizadas

- **React Native**: Framework para desarrollo móvil multiplataforma
- **Expo**: Plataforma y herramientas para React Native
- **expo-sensors**: Biblioteca para acceder a sensores del dispositivo

## 📦 Estructura del Proyecto

```
LifeSync-Games App/
├── App.js              # Componente principal
├── package.json        # Dependencias del proyecto
├── app.json           # Configuración de Expo
├── babel.config.js    # Configuración de Babel
└── README.md          # Este archivo
```

## 🔮 Próximos Pasos

Puedes extender esta aplicación agregando:
- Gráficos en tiempo real para visualizar los datos
- Grabación de datos de sensores
- Juegos que utilicen los sensores (ej: control de movimiento)
- Calibración de sensores
- Exportación de datos

## 📝 Notas

- Los sensores requieren permisos del dispositivo (se solicitan automáticamente)
- El rendimiento puede variar según el dispositivo
- Algunos sensores pueden no estar disponibles en todos los dispositivos

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

### Otros problemas:

1. Asegúrate de tener la última versión de Expo Go
2. Limpia la caché: `npm run start:clear`
3. Reinstala las dependencias: `rm -rf node_modules && npm install`
4. Si los sensores no funcionan, verifica que tu dispositivo los tenga disponibles

## 📄 Licencia

Este proyecto es de código abierto y está disponible para uso personal y educativo.

