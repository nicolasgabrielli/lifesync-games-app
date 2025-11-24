# Instalación del Módulo Nativo para Detección Real

## Pasos para Habilitar Detección Real de Aplicaciones

### Paso 1: Prebuild (Generar carpetas nativas)

```bash
cd "LifeSync-Games App"
npx expo prebuild
```

Esto creará las carpetas `android/` y `ios/` con el código nativo.

### Paso 2: Copiar archivos del módulo nativo

Copia los siguientes archivos a sus ubicaciones correspondientes:

#### Archivos Java

1. **AppUsageModule.java** → 
   ```
   android/app/src/main/java/com/lifesync/games/AppUsageModule.java
   ```

2. **AppUsagePackage.java** → 
   ```
   android/app/src/main/java/com/lifesync/games/AppUsagePackage.java
   ```

3. **AppAccessibilityService.java** → 
   ```
   android/app/src/main/java/com/lifesync/games/AppAccessibilityService.java
   ```

#### Archivos de recursos

4. **accessibility_service_config.xml** → 
   ```
   android/app/src/main/res/xml/accessibility_service_config.xml
   ```

5. **strings.xml** → 
   ```
   android/app/src/main/res/values/strings.xml
   ```
   (Si ya existe strings.xml, agrega solo la línea del string)

### Paso 3: Actualizar AndroidManifest.xml

Abre `android/app/src/main/AndroidManifest.xml` y agrega dentro de `<application>`:

```xml
<service
    android:name=".AppAccessibilityService"
    android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
    android:exported="false">
    <intent-filter>
        <action android:name="android.accessibilityservice.AccessibilityService" />
    </intent-filter>
    <meta-data
        android:name="android.accessibilityservice"
        android:resource="@xml/accessibility_service_config" />
</service>
```

### Paso 4: Registrar el módulo en MainApplication.java

Abre `android/app/src/main/java/com/lifesync/games/MainApplication.java` y:

1. Importa el package:
   ```java
   import com.lifesync.games.AppUsagePackage;
   ```

2. En el método `getPackages()`, agrega:
   ```java
   packages.add(new AppUsagePackage());
   ```

### Paso 5: Compilar y ejecutar

```bash
npx expo run:android
```

O si prefieres usar Expo Go (pero el módulo nativo no funcionará):
```bash
npx expo start
```

## Habilitar el Servicio de Accesibilidad

Una vez que la app esté instalada:

1. Ve a **Configuración** > **Accesibilidad**
2. Busca **"LifeSync Games"** en la lista de servicios
3. Activa el servicio
4. Regresa a la app

El sensor ahora detectará aplicaciones reales en tiempo real.

## Verificación

Cuando el servicio esté habilitado, verás en los logs:
```
[AppSessions] App real detectada: Instagram
[AppSessions] Cambio de app detectado: com.instagram.android
```

Y el sensor mostrará `isRealDetection: true` en los datos.

