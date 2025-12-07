/**
 * Servicio para detectar aplicaciones en uso
 * Usa módulo nativo para detección real
 */
import { Platform, Linking, Alert, NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';

// Cargar módulo nativo de forma segura
let AppUsage = null;
let appUsageEmitter = DeviceEventEmitter;

try {
  if (NativeModules && NativeModules.AppUsage) {
    AppUsage = NativeModules.AppUsage;
    try {
      appUsageEmitter = new NativeEventEmitter(AppUsage);
    } catch (error) {
      console.warn('[AppUsage] No se pudo crear NativeEventEmitter, usando DeviceEventEmitter:', error.message);
      appUsageEmitter = DeviceEventEmitter;
    }
  } else {
    console.log('[AppUsage] Módulo nativo AppUsage no disponible');
  }
} catch (error) {
  console.error('[AppUsage] Error al cargar módulo nativo:', error);
  // Continuar sin módulo nativo, usar DeviceEventEmitter
  appUsageEmitter = DeviceEventEmitter;
}

// Variable para almacenar la app actual detectada
let currentAppPackage = null;
let currentAppListeners = [];

/**
 * Verifica si tenemos permisos para acceder a estadísticas de uso
 * Intenta usar el módulo nativo si está disponible
 */
export const checkUsageStatsPermission = async () => {
  if (Platform.OS !== 'android') {
    return { 
      granted: false, 
      simulationMode: true,
      error: 'Detección de apps no disponible en iOS con Expo managed workflow.' 
    };
  }

  // Verificar si el módulo nativo está disponible
  if (!AppUsage) {
    console.log('[AppUsage] Módulo nativo no disponible');
    return { 
      granted: false, 
      needsManualPermission: true,
      simulationMode: true,
      error: 'Módulo nativo no disponible. Se requiere expo-dev-client y módulo nativo para detección real.' 
    };
  }

  try {
    let hasAccessibility = false;
    let hasUsageStats = false;
    
    // Verificar servicio de accesibilidad
    if (AppUsage.isAccessibilityServiceEnabled) {
      try {
        hasAccessibility = await AppUsage.isAccessibilityServiceEnabled();
        console.log('[AppUsage] Servicio de accesibilidad:', hasAccessibility ? 'habilitado' : 'no habilitado');
      } catch (error) {
        console.log('[AppUsage] Error al verificar accesibilidad:', error.message);
      }
    }
    
    // Verificar permisos de UsageStats
    if (AppUsage.hasUsageStatsPermission) {
      try {
        hasUsageStats = await AppUsage.hasUsageStatsPermission();
        console.log('[AppUsage] Permisos de UsageStats:', hasUsageStats ? 'otorgados' : 'no otorgados');
      } catch (error) {
        console.log('[AppUsage] Error al verificar UsageStats:', error.message);
      }
    }
    
    // Si cualquiera de los dos está habilitado, tenemos detección real
    if (hasAccessibility || hasUsageStats) {
      console.log('[AppUsage] Detección real habilitada mediante:', hasAccessibility ? 'accesibilidad' : 'usage_stats');
      return { 
        granted: true, 
        simulationMode: false,
        method: hasAccessibility ? 'accessibility' : 'usage_stats'
      };
    }
    
    // Si ninguno está habilitado, usar modo simulación
    console.log('[AppUsage] Ningún permiso habilitado, usando modo simulación');
    return { 
      granted: false, 
      needsManualPermission: true,
      simulationMode: true,
      method: 'none',
      error: 'Permisos no otorgados. Habilita el servicio de accesibilidad o el acceso a datos de uso.' 
    };
  } catch (error) {
    console.error('[AppUsage] Error al verificar permisos:', error);
    return { 
      granted: false,
      simulationMode: true,
      error: 'Error al verificar permisos. Funcionando en modo simulación.' 
    };
  }
};

/**
 * Abre la configuración de permisos de uso de apps en Android
 */
export const openUsageStatsSettings = () => {
  if (Platform.OS === 'android') {
    try {
      if (AppUsage && AppUsage.openUsageStatsSettings) {
        AppUsage.openUsageStatsSettings();
      } else {
        Linking.openSettings();
      }
    } catch (error) {
      console.error('[AppUsage] Error al abrir configuración:', error);
      Linking.openSettings();
    }
  }
};

/**
 * Abre la configuración de accesibilidad (alternativa para Xiaomi/MIUI)
 */
export const openAccessibilitySettings = () => {
  if (Platform.OS === 'android') {
    try {
      if (AppUsage && AppUsage.openAccessibilitySettings) {
        AppUsage.openAccessibilitySettings();
      } else {
        Linking.openURL('android.settings.ACCESSIBILITY_SETTINGS');
      }
    } catch (error) {
      console.error('[AppUsage] Error al abrir configuración de accesibilidad:', error);
      Linking.openSettings();
    }
  }
};

/**
 * Obtiene la aplicación actual en primer plano
 * Usa el módulo nativo si está disponible
 */
export const getCurrentApp = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    // Si tenemos la app actual almacenada, retornarla
    if (currentAppPackage) {
      return currentAppPackage;
    }
    
    // Intentar obtener del módulo nativo
    if (AppUsage && AppUsage.getCurrentApp) {
      const app = await AppUsage.getCurrentApp();
      // El módulo nativo retorna directamente el packageName como string
      if (app) {
        currentAppPackage = app;
        return app;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[AppUsage] Error al obtener app actual:', error);
    return null;
  }
};

/**
 * Obtiene el historial de apps guardado (útil cuando la app se reabre)
 */
export const getSavedAppHistory = async () => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    if (AppUsage && AppUsage.getSavedAppHistory) {
      const history = await AppUsage.getSavedAppHistory();
      if (history && history.currentApp) {
        currentAppPackage = history.currentApp;
        console.log('[AppUsage] Historial cargado:', {
          currentApp: history.currentApp,
          lastUpdate: history.lastUpdate,
          historyLength: history.history?.length || 0
        });
        
        // Si hay historial y listeners activos, procesar los eventos guardados
        if (history.history && history.history.length > 0 && currentAppListeners.length > 0) {
          console.log('[AppUsage] Procesando eventos guardados del historial...');
          // Procesar los últimos eventos del historial para notificar a los listeners
          const recentEvents = history.history.slice(-10); // Últimos 10 eventos
          recentEvents.forEach((entry, index) => {
            setTimeout(() => {
              console.log(`[AppUsage] Procesando evento guardado ${index + 1}/${recentEvents.length}:`, entry.packageName);
              // Simular evento para los listeners activos
              const event = {
                packageName: entry.packageName,
                timestamp: entry.timestamp
              };
              currentAppListeners.forEach(listener => {
                try {
                  // Los listeners son subscriptions, necesitamos emitir manualmente
                  if (listener._listener) {
                    listener._listener(event);
                  }
                } catch (error) {
                  console.error('[AppUsage] Error procesando evento guardado:', error);
                }
              });
            }, index * 100); // Espaciar los eventos
          });
        }
      }
      return history;
    }
    return null;
  } catch (error) {
    console.error('[AppUsage] Error al obtener historial guardado:', error);
    return null;
  }
};

/**
 * Procesa eventos guardados y los envía a los listeners activos
 */
export const processSavedEvents = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    const history = await getSavedAppHistory();
    if (history && history.currentApp) {
      // Enviar el evento de la app actual usando DeviceEventEmitter
      // Esto activará todos los listeners que están escuchando 'onAppChanged'
      console.log('[AppUsage] 📤 Enviando app actual guardada a listeners:', history.currentApp);
      
      // Emitir evento usando DeviceEventEmitter - esto activará todos los listeners
      DeviceEventEmitter.emit('onAppChanged', {
        packageName: history.currentApp,
        timestamp: history.lastUpdate || Date.now()
      });
      
      console.log('[AppUsage] ✅ Evento guardado emitido a', currentAppListeners.length, 'listeners');
    }
  } catch (error) {
    console.error('[AppUsage] Error procesando eventos guardados:', error);
  }
};

/**
 * Configura un listener para cambios de aplicación
 * @param {Function} callback - Función que se llama cuando cambia la app
 * @returns {Function} Función para remover el listener
 */
export const onAppChanged = (callback) => {
  // Reducir logging inicial para mejor rendimiento
  if (!callback) {
    console.warn('[AppUsage] ⚠️ No se proporcionó callback para onAppChanged');
    return () => {};
  }
  
  // El servicio de accesibilidad usa RCTDeviceEventEmitter que se accede vía DeviceEventEmitter
  // Escuchar en DeviceEventEmitter que es el wrapper de JavaScript para RCTDeviceEventEmitter
  const deviceSubscription = DeviceEventEmitter.addListener('onAppChanged', (event) => {
    // Reducir logging para mejor rendimiento - solo loguear errores
    const packageName = event?.packageName || (typeof event === 'string' ? event : null);
    if (packageName) {
      currentAppPackage = packageName;
      
      if (callback) {
        try {
          callback(packageName);
        } catch (error) {
          console.error('[AppUsage] ❌ Error ejecutando callback:', error);
        }
      }
    }
  });
  
  // También intentar con NativeEventEmitter si el módulo está disponible
  let nativeSubscription = null;
  if (appUsageEmitter && AppUsage) {
    try {
      nativeSubscription = appUsageEmitter.addListener('onAppChanged', (event) => {
        // Reducir logging para mejor rendimiento
        const packageName = event?.packageName || (typeof event === 'string' ? event : null);
        if (packageName) {
          currentAppPackage = packageName;
          if (callback) {
            try {
              callback(packageName);
            } catch (error) {
              console.error('[AppUsage] ❌ Error ejecutando callback:', error);
            }
          }
        }
      });
      currentAppListeners.push(nativeSubscription);
      console.log('[AppUsage] ✅ NativeEventEmitter listener configurado');
    } catch (error) {
      console.warn('[AppUsage] ⚠️ Error al configurar NativeEventEmitter:', error.message);
    }
  } else {
    console.log('[AppUsage] ℹ️ NativeEventEmitter no disponible, usando solo DeviceEventEmitter');
  }
  
  currentAppListeners.push(deviceSubscription);
  
  // Probar obtener app actual inmediatamente (sin logging excesivo)
  if (AppUsage && AppUsage.getCurrentApp) {
    AppUsage.getCurrentApp().then((app) => {
      if (app) {
        currentAppPackage = app;
      }
    }).catch(() => {
      // Silenciar errores menores
    });
  }
  
  return () => {
    deviceSubscription.remove();
    if (nativeSubscription) {
      nativeSubscription.remove();
    }
    currentAppListeners = currentAppListeners.filter(s => s !== deviceSubscription && s !== nativeSubscription);
  };
};

/**
 * Limpia todos los listeners
 */
export const removeAllListeners = () => {
  currentAppListeners.forEach(subscription => {
    try {
      subscription.remove();
    } catch (error) {
      // Ignorar errores al remover listeners
    }
  });
  currentAppListeners = [];
  currentAppPackage = null;
};

/**
 * Obtiene estadísticas de uso de aplicaciones
 */
export const getUsageStats = async (startTime, endTime) => {
  try {
    if (AppUsage && AppUsage.getUsageStats) {
      return await AppUsage.getUsageStats(startTime, endTime);
    }
    return [];
  } catch (error) {
    console.error('[AppUsage] Error al obtener estadísticas:', error);
    return [];
  }
};

/**
 * Re-verifica los permisos (útil cuando el usuario regresa de la configuración)
 */
export const recheckPermissions = async () => {
  console.log('[AppUsage] Re-verificando permisos...');
  return await checkUsageStatsPermission();
};

/**
 * Función de diagnóstico para verificar el estado del sistema
 */
export const diagnoseAppDetection = async () => {
  console.log('[AppUsage] ========== DIAGNÓSTICO ==========');
  console.log('[AppUsage] Platform.OS:', Platform.OS);
  console.log('[AppUsage] AppUsage módulo disponible:', !!AppUsage);
  
  if (Platform.OS === 'android' && AppUsage) {
    try {
      // Verificar servicio de accesibilidad
      if (AppUsage.isAccessibilityServiceEnabled) {
        const hasAccessibility = await AppUsage.isAccessibilityServiceEnabled();
        console.log('[AppUsage] Servicio de accesibilidad habilitado:', hasAccessibility);
      }
      
      // Verificar permisos de UsageStats
      if (AppUsage.hasUsageStatsPermission) {
        const hasUsageStats = await AppUsage.hasUsageStatsPermission();
        console.log('[AppUsage] Permisos de UsageStats:', hasUsageStats);
      }
      
      // Obtener app actual
      if (AppUsage.getCurrentApp) {
        const currentApp = await AppUsage.getCurrentApp();
        console.log('[AppUsage] App actual:', currentApp || 'Ninguna');
      }
      
      // Obtener historial guardado
      if (AppUsage.getSavedAppHistory) {
        const history = await AppUsage.getSavedAppHistory();
        console.log('[AppUsage] Historial guardado:', history ? 'Disponible' : 'No disponible');
        if (history) {
          console.log('[AppUsage] - App actual en historial:', history.currentApp);
          console.log('[AppUsage] - Última actualización:', history.lastUpdate);
          console.log('[AppUsage] - Entradas en historial:', history.history?.length || 0);
        }
      }
    } catch (error) {
      console.error('[AppUsage] Error en diagnóstico:', error);
    }
  }
  
  console.log('[AppUsage] Listeners activos:', currentAppListeners.length);
  console.log('[AppUsage] App actual en memoria:', currentAppPackage);
  console.log('[AppUsage] =================================');
};

/**
 * Muestra un diálogo informativo sobre cómo otorgar permisos
 */
export const showUsageStatsPermissionInfo = () => {
  if (Platform.OS === 'android') {
    Alert.alert(
      'Permiso de Acceso a Datos de Uso',
      'Para detectar las aplicaciones que usas, necesitas otorgar permisos.\n\n' +
      'OPCIÓN 1 - Servicio de Accesibilidad (Recomendado para Xiaomi):\n' +
      '1. Toca "Abrir Accesibilidad"\n' +
      '2. Busca "LifeSync Games" en la lista\n' +
      '3. Activa el servicio\n' +
      '4. Regresa a la app\n\n' +
      'OPCIÓN 2 - Acceso a Datos de Uso:\n' +
      '1. Ve a Configuración > Aplicaciones\n' +
      '2. Toca "Acceso a datos de uso"\n' +
      '3. Busca "LifeSync Games" y actívalo\n\n' +
      'También asegúrate de:\n' +
      '- Permitir inicio automático de la app\n' +
      '- Desactivar optimización de batería para esta app',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Abrir Accesibilidad',
          onPress: openAccessibilitySettings,
        },
        {
          text: 'Acceso a Datos de Uso',
          onPress: openUsageStatsSettings,
        },
      ]
    );
  } else {
    Alert.alert(
      'Detección de Apps',
      'La detección de aplicaciones en uso no está disponible en iOS con Expo managed workflow.',
      [{ text: 'Entendido' }]
    );
  }
};
