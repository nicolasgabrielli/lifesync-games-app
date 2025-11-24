# Guía de Depuración de Sensores

## Problema: Los sensores no detectan aplicaciones

Si los sensores no están detectando las aplicaciones que abres, sigue estos pasos:

### 1. Verificar que el Servicio de Accesibilidad esté Habilitado

1. Ve a **Configuración** → **Accesibilidad** (o **Configuración** → **Accesibilidad** → **Servicios instalados**)
2. Busca **"LifeSync Games"** o **"AppAccessibilityService"**
3. Asegúrate de que esté **ACTIVADO**
4. Si no aparece, la app necesita ser reinstalada después de compilar

### 2. Verificar Permisos de Uso de Apps (Alternativa)

1. Ve a **Configuración** → **Aplicaciones** → **Acceso a datos de uso**
2. Busca **"LifeSync Games"**
3. Actívalo si está disponible

### 3. Revisar los Logs

Abre la consola de desarrollo (Metro bundler) y busca estos mensajes:

#### Logs Esperados al Iniciar el Sensor:
```
[AppSessions] ========== INICIANDO SENSOR ==========
[AppUsage] ========== DIAGNÓSTICO ==========
[AppUsage] Servicio de accesibilidad habilitado: true
[AppUsage] ✅✅✅ LISTENERS CONFIGURADOS CORRECTAMENTE ✅✅✅
```

#### Logs Esperados al Cambiar de App:
```
[AppAccessibilityService] 🔄 App changed: com.instagram.android → com.whatsapp
[AppAccessibilityService] ✅ Evento enviado a React Native: com.whatsapp
[AppUsage] 🔔🔔🔔 EVENTO RECIBIDO EN DeviceEventEmitter 🔔🔔🔔
[AppSessions] 📱 CALLBACK EJECUTADO - Aplicación activa: WhatsApp
```

### 4. Problemas Comunes

#### Problema: "ReactContext no disponible"
**Solución**: Reinicia la app completamente (ciérrala y vuelve a abrirla)

#### Problema: "Servicio de accesibilidad habilitado: false"
**Solución**: 
1. Ve a Configuración → Accesibilidad
2. Desactiva y vuelve a activar el servicio de LifeSync Games
3. Reinicia la app

#### Problema: No aparecen eventos en los logs
**Solución**:
1. Verifica que el servicio de accesibilidad esté activado
2. Prueba cambiar de app varias veces
3. Revisa los logs de Android con: `adb logcat | grep AppAccessibilityService`

### 5. Comandos de Diagnóstico

#### Ver logs de Android en tiempo real:
```bash
adb logcat | grep -E "(AppAccessibilityService|AppUsage|AppSessions)"
```

#### Verificar que el servicio esté corriendo:
```bash
adb shell dumpsys accessibility | grep -A 10 "LifeSync"
```

#### Limpiar datos y reiniciar:
```bash
adb shell pm clear com.lifesync.games
# Luego reinstala la app
```

### 6. Probar Manualmente

1. Abre la app LifeSync Games
2. Activa el sensor de sesiones de apps
3. Cambia a otra app (ej: WhatsApp, Instagram)
4. Vuelve a LifeSync Games
5. Revisa los logs - deberías ver eventos de cambio de app

### 7. Si Nada Funciona

1. Desinstala completamente la app
2. Limpia el build: `cd android && ./gradlew clean`
3. Recompila: `npx expo run:android`
4. Vuelve a habilitar el servicio de accesibilidad
5. Prueba de nuevo

## Notas Importantes

- El servicio de accesibilidad **debe estar activado** para que funcione
- Los eventos solo se detectan cuando cambias de app, no cuando abres la misma app
- Si la app está cerrada, los eventos se guardan y se procesan cuando la reabres
- Algunos fabricantes (Xiaomi, Huawei) pueden tener restricciones adicionales

