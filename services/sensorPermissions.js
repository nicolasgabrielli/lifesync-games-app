/**
 * Servicio para manejar permisos de sensores
 */
import { Platform, Alert } from 'react-native';
import * as Sensors from 'expo-sensors';

/**
 * Solicita permisos para sensores según el tipo
 */
export const requestSensorPermissions = async (sensorType) => {
  try {
    switch (sensorType) {
      case 'step_count':
        // Para el sensor de pasos, necesitamos el acelerómetro
        console.log('[LifeSync] Verificando disponibilidad del acelerómetro...');
        
        // Verificar disponibilidad del acelerómetro
        const isAvailable = await Sensors.Accelerometer.isAvailableAsync();
        console.log('[LifeSync] Acelerómetro disponible:', isAvailable);
        
        if (!isAvailable) {
          return {
            granted: false,
            error: 'El acelerómetro no está disponible en este dispositivo',
          };
        }

        // En Android 12+ (API 31+), se requiere permiso para sensores de alta frecuencia
        // En Expo, esto generalmente se maneja automáticamente, pero verificamos
        if (Platform.OS === 'android') {
          try {
            // Intentar configurar el intervalo de actualización para verificar acceso
            // Si falla, significa que no tenemos permisos
            Sensors.Accelerometer.setUpdateInterval(100);
            console.log('[LifeSync] Permisos del acelerómetro verificados correctamente');
          } catch (error) {
            console.error('[LifeSync] Error al acceder al acelerómetro:', error);
            return {
              granted: false,
              error: 'No se pudo acceder al acelerómetro. Verifica los permisos de la app.',
            };
          }
        }

        // En iOS, el acelerómetro está disponible sin permisos explícitos
        // pero verificamos que funcione
        if (Platform.OS === 'ios') {
          try {
            Sensors.Accelerometer.setUpdateInterval(100);
            console.log('[LifeSync] Acelerómetro configurado correctamente en iOS');
          } catch (error) {
            console.error('[LifeSync] Error al acceder al acelerómetro en iOS:', error);
            return {
              granted: false,
              error: 'No se pudo acceder al acelerómetro en este dispositivo.',
            };
          }
        }

        return { granted: true };

      case 'app_sessions':
      case 'phone_usage':
        // Estos sensores REQUIEREN permisos - no funcionan sin ellos
        if (Platform.OS === 'android') {
          // Importar dinámicamente para evitar errores de importación circular
          const { checkUsageStatsPermission } = require('./appUsageDetection');
          const permissionResult = await checkUsageStatsPermission();
          
          if (permissionResult.granted && !permissionResult.simulationMode) {
            console.log('[LifeSync] ✅ Permisos otorgados, detección real habilitada');
            return {
              granted: true,
              simulationMode: false,
              method: permissionResult.method || 'unknown',
            };
          }
          
          // Si no hay permisos, NO permitir funcionar
          console.error('[LifeSync] ❌ Permisos no otorgados. El sensor requiere permisos para funcionar.');
          return {
            granted: false,
            error: 'Permisos de detección de apps no otorgados. Habilita el servicio de accesibilidad o el acceso a datos de uso.',
            needsPermission: true,
            simulationMode: false,
          };
        } else {
          // iOS requiere ScreenTime framework que no está disponible en Expo managed
          return {
            granted: false,
            error: 'Detección real no disponible en iOS con Expo managed workflow.',
            simulationMode: false,
          };
        }

      case 'github_contributions':
        // No requiere permisos, es una API externa
        return { granted: true };

      default:
        return { granted: true };
    }
  } catch (error) {
    console.error('[LifeSync] Error al solicitar permisos:', error);
    return {
      granted: false,
      error: error.message || 'Error al solicitar permisos',
    };
  }
};

/**
 * Verifica si un sensor está disponible
 */
export const checkSensorAvailability = async (sensorType) => {
  try {
    switch (sensorType) {
      case 'step_count':
        const isAvailable = await Sensors.Accelerometer.isAvailableAsync();
        console.log('[LifeSync] Acelerómetro disponible:', isAvailable);
        return isAvailable;
      default:
        return true;
    }
  } catch (error) {
    console.error('[LifeSync] Error al verificar disponibilidad:', error);
    return false;
  }
};

/**
 * Muestra un diálogo informativo sobre los permisos necesarios
 */
export const showPermissionInfo = (sensorType) => {
  if (sensorType === 'step_count') {
    Alert.alert(
      'Permisos del Acelerómetro',
      'Esta app necesita acceso al acelerómetro de tu dispositivo para contar pasos. ' +
      'El acelerómetro es un sensor de hardware que no requiere permisos especiales en la mayoría de dispositivos. ' +
      'Si experimentas problemas, verifica la configuración de permisos de la app en la configuración del sistema.',
      [{ text: 'Entendido' }]
    );
  } else if (sensorType === 'app_sessions' || sensorType === 'phone_usage') {
    // Importar dinámicamente para evitar errores de importación circular
    const { showUsageStatsPermissionInfo } = require('./appUsageDetection');
    showUsageStatsPermissionInfo();
  }
};
