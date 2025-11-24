/**
 * Servicio global de gestión de sensores
 * Mantiene los sensores activos independientemente de qué pantalla esté visible
 * y persiste el estado para que funcionen incluso cuando la app está cerrada
 */
import { AppState } from 'react-native';
import { createSensor } from '../sensors';
import { saveSensorPoints, saveSensorData, getSensorData, getSensorPointsById } from './sensorStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_SENSORS_KEY = '@LifeSync:activeSensors';

class SensorManager {
  constructor() {
    this.sensors = new Map(); // Map<sensorId, sensorInstance>
    this.callbacks = new Map(); // Map<sensorId, {onDataUpdate, onPointsUpdate}>
    this.isInitialized = false;
    this.appStateSubscription = null;
    this.lastSaveTime = 0; // Para throttling de guardado
  }

  /**
   * Inicializa el servicio global
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[SensorManager] Ya está inicializado');
      return;
    }

    console.log('[SensorManager] Inicializando servicio global...');
    
    // Cargar sensores activos guardados
    await this.loadActiveSensors();
    
    // Escuchar cambios de estado de la app
    this.setupAppStateListener();
    
    this.isInitialized = true;
    console.log('[SensorManager] ✅ Servicio global inicializado');
  }

  /**
   * Carga los sensores activos desde el almacenamiento
   */
  async loadActiveSensors() {
    try {
      const activeSensorsData = await AsyncStorage.getItem(ACTIVE_SENSORS_KEY);
      if (activeSensorsData) {
        const activeSensors = JSON.parse(activeSensorsData);
        console.log('[SensorManager] Sensores activos encontrados:', Object.keys(activeSensors));
        
        // Los sensores se reactivarán cuando se registren callbacks
        // No los iniciamos aquí porque necesitamos los callbacks primero
      }
    } catch (error) {
      console.error('[SensorManager] Error al cargar sensores activos:', error);
    }
  }

  /**
   * Guarda la lista de sensores activos
   */
  async saveActiveSensors() {
    try {
      const activeSensors = {};
      const activeSensorIds = [];
      this.sensors.forEach((instance, sensorId) => {
        activeSensors[sensorId] = {
          type: instance.sensorId, // Guardamos el ID como referencia
          isActive: true,
        };
        activeSensorIds.push(sensorId);
      });
      await AsyncStorage.setItem(ACTIVE_SENSORS_KEY, JSON.stringify(activeSensors));
      
      // También guardar en SharedPreferences nativo de Android para que el servicio de background pueda verificar
      // incluso cuando la app está cerrada
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.AppUsage && NativeModules.AppUsage.saveActiveSensors) {
          await NativeModules.AppUsage.saveActiveSensors(activeSensorIds);
        }
      } catch (error) {
        // Si no está disponible el método nativo, no es crítico
        console.warn('[SensorManager] No se pudo guardar en SharedPreferences nativo:', error.message);
      }
      
      console.log('[SensorManager] Sensores activos guardados:', activeSensorIds);
    } catch (error) {
      console.error('[SensorManager] Error al guardar sensores activos:', error);
    }
  }

  /**
   * Configura el listener de cambios de estado de la app
   */
  setupAppStateListener() {
    this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('[SensorManager] App volvió al primer plano - Verificando sensores activos');
        // Verificar que todos los sensores activos sigan funcionando
        await this.verifyActiveSensors();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        console.log('[SensorManager] App fue a segundo plano - Guardando estado de sensores');
        // Guardar estado antes de ir a background
        await this.saveAllSensorStates();
      }
    });
  }

  /**
   * Verifica que todos los sensores activos sigan funcionando
   */
  async verifyActiveSensors() {
    // Cargar historial de apps guardado si está disponible
    try {
      const { getSavedAppHistory, processSavedEvents } = require('./appUsageDetection');
      
      // Procesar eventos guardados primero
      await processSavedEvents();
      
      const savedHistory = await getSavedAppHistory();
      if (savedHistory && savedHistory.currentApp) {
        console.log(`[SensorManager] Historial de apps cargado: app actual=${savedHistory.currentApp}`);
        // Procesar historial guardado si hay sensores de apps activos
        await this.processSavedAppHistory(savedHistory);
      }
    } catch (error) {
      console.error('[SensorManager] Error al cargar historial guardado:', error);
    }
    
    for (const [sensorId, sensorInstance] of this.sensors.entries()) {
      try {
        // Verificar que el sensor tenga un método update o similar
        if (sensorInstance && typeof sensorInstance.update === 'function') {
          // El sensor está activo, forzar una actualización
          await sensorInstance.update();
          console.log(`[SensorManager] ✅ Sensor ${sensorId} verificado y funcionando`);
        }
      } catch (error) {
        console.error(`[SensorManager] Error al verificar sensor ${sensorId}:`, error);
      }
    }
  }

  /**
   * Procesa el historial de apps guardado para sensores activos
   */
  async processSavedAppHistory(history) {
    if (!history || !history.history || history.history.length === 0) {
      return;
    }

    // Buscar sensores de apps que estén activos
    // Los sensores de apps tienen IDs '1' (app_sessions) y '2' (phone_usage)
    const appSensorIds = ['1', '2'];
    
    for (const [sensorId, sensorInstance] of this.sensors.entries()) {
      // Solo procesar para sensores de apps
      if (sensorInstance && appSensorIds.includes(sensorId)) {
        try {
          // El sensor procesará el historial automáticamente cuando se actualice
          // La app actual se establecerá cuando el sensor llame a getCurrentApp
          console.log(`[SensorManager] Historial disponible para sensor ${sensorId}, se procesará en la próxima actualización`);
        } catch (error) {
          console.error(`[SensorManager] Error al procesar historial para sensor ${sensorId}:`, error);
        }
      }
    }
  }

  /**
   * Guarda el estado de todos los sensores activos
   * También guarda en SharedPreferences nativo para que el servicio de background pueda verificar
   */
  async saveAllSensorStates() {
    for (const [sensorId, sensorInstance] of this.sensors.entries()) {
      try {
        // Guardar datos del sensor si tiene método getStats
        if (sensorInstance && typeof sensorInstance.getStats === 'function') {
          const stats = sensorInstance.getStats();
          if (stats) {
            await saveSensorData(sensorId, stats);
          }
        }
      } catch (error) {
        console.error(`[SensorManager] Error al guardar estado del sensor ${sensorId}:`, error);
      }
    }
    await this.saveActiveSensors();
  }

  /**
   * Registra un sensor con sus callbacks
   * @param {string} sensorId - ID del sensor
   * @param {string} sensorType - Tipo de sensor
   * @param {string} category - Categoría del sensor
   * @param {Function} onDataUpdate - Callback para actualizaciones de datos
   * @param {Function} onPointsUpdate - Callback para actualizaciones de puntos
   */
  registerSensor(sensorId, sensorType, category, onDataUpdate, onPointsUpdate) {
    console.log(`[SensorManager] Registrando sensor: ${sensorId} (${sensorType})`);
    
    // Guardar callbacks
    this.callbacks.set(sensorId, { onDataUpdate, onPointsUpdate });
    
    // Si el sensor ya existe, actualizar callbacks
    if (this.sensors.has(sensorId)) {
      console.log(`[SensorManager] Sensor ${sensorId} ya existe, actualizando callbacks`);
      return;
    }
    
    // Crear instancia del sensor
    const sensorInstance = createSensor(sensorType, sensorId, category, 
      (data) => {
        const callbacks = this.callbacks.get(sensorId);
        if (callbacks && callbacks.onDataUpdate) {
          callbacks.onDataUpdate(data);
        }
        // Guardar datos automáticamente (con throttling para evitar escrituras excesivas)
        if (!this.lastSaveTime || Date.now() - this.lastSaveTime > 5000) {
          this.lastSaveTime = Date.now();
          saveSensorData(sensorId, data).catch(err => 
            console.error(`[SensorManager] Error al guardar datos de ${sensorId}:`, err)
          );
        }
      },
      (points) => {
        const callbacks = this.callbacks.get(sensorId);
        if (callbacks && callbacks.onPointsUpdate) {
          callbacks.onPointsUpdate(points);
        }
        // Guardar puntos automáticamente (con throttling)
        if (!this.lastSaveTime || Date.now() - this.lastSaveTime > 5000) {
          this.lastSaveTime = Date.now();
          getSensorPointsById(sensorId).then(currentPoints => {
            const newPoints = Math.max(0, (currentPoints || 0) + points);
            saveSensorPoints(sensorId, newPoints, category).catch(err =>
              console.error(`[SensorManager] Error al guardar puntos de ${sensorId}:`, err)
            );
          });
        }
      }
    );
    
    this.sensors.set(sensorId, sensorInstance);
    console.log(`[SensorManager] ✅ Sensor ${sensorId} registrado`);
  }

  /**
   * Inicia un sensor
   */
  async startSensor(sensorId, sensorType, category, sensorData = null) {
    console.log(`[SensorManager] Iniciando sensor: ${sensorId}`);
    
    let sensorInstance = this.sensors.get(sensorId);
    
    // Si no existe, registrarlo primero (pero necesitamos callbacks)
    if (!sensorInstance) {
      console.warn(`[SensorManager] Sensor ${sensorId} no está registrado. Debe registrarse primero con registerSensor()`);
      return false;
    }
    
    try {
      // Restaurar datos si existen
      if (sensorData && typeof sensorInstance.restoreFromData === 'function') {
        sensorInstance.restoreFromData(sensorData);
      } else {
        // Intentar cargar desde almacenamiento
        const savedData = await getSensorData(sensorId);
        if (savedData && typeof sensorInstance.restoreFromData === 'function') {
          sensorInstance.restoreFromData(savedData);
        }
      }
      
      // Iniciar el sensor
      await sensorInstance.start();
      
      // Guardar que está activo
      await this.saveActiveSensors();
      
      // Si es el sensor de app_sessions (ID "1"), asegurar que el servicio de background esté corriendo
      if (sensorId === '1' && sensorType === 'app_sessions') {
        try {
          const { NativeModules } = require('react-native');
          if (NativeModules.AppUsage && NativeModules.AppUsage.startBackgroundPolling) {
            await NativeModules.AppUsage.startBackgroundPolling();
            console.log(`[SensorManager] ✅ Servicio de background iniciado para sensor ${sensorId}`);
          }
        } catch (error) {
          console.warn(`[SensorManager] No se pudo iniciar servicio de background:`, error.message);
        }
      }
      
      console.log(`[SensorManager] ✅ Sensor ${sensorId} iniciado`);
      return true;
    } catch (error) {
      console.error(`[SensorManager] Error al iniciar sensor ${sensorId}:`, error);
      return false;
    }
  }

  /**
   * Detiene un sensor
   */
  async stopSensor(sensorId) {
    console.log(`[SensorManager] Deteniendo sensor: ${sensorId}`);
    
    const sensorInstance = this.sensors.get(sensorId);
    if (!sensorInstance) {
      console.warn(`[SensorManager] Sensor ${sensorId} no existe`);
      return;
    }
    
    try {
      // Guardar estado final antes de detener
      if (typeof sensorInstance.getStats === 'function') {
        const stats = sensorInstance.getStats();
        if (stats) {
          await saveSensorData(sensorId, stats);
        }
      }
      
      // Detener el sensor
      if (typeof sensorInstance.stop === 'function') {
        sensorInstance.stop();
      }
      
      // NO eliminar el sensor del mapa, solo detenerlo
      // Esto permite que se reactive fácilmente
      
      // Actualizar lista de activos
      await this.saveActiveSensors();
      
      console.log(`[SensorManager] ✅ Sensor ${sensorId} detenido`);
    } catch (error) {
      console.error(`[SensorManager] Error al detener sensor ${sensorId}:`, error);
    }
  }

  /**
   * Obtiene la instancia de un sensor
   */
  getSensor(sensorId) {
    return this.sensors.get(sensorId);
  }

  /**
   * Verifica si un sensor está activo
   */
  isSensorActive(sensorId) {
    const sensorInstance = this.sensors.get(sensorId);
    if (!sensorInstance) return false;
    
    // Verificar si tiene intervalId, subscription, appChangeListener o algún indicador de actividad
    return sensorInstance.intervalId != null || 
           (sensorInstance.subscription != null) ||
           (sensorInstance.appChangeListener != null) ||
           (sensorInstance.isActive === true);
  }

  /**
   * Actualiza los callbacks de un sensor
   */
  updateCallbacks(sensorId, onDataUpdate, onPointsUpdate) {
    if (this.callbacks.has(sensorId)) {
      this.callbacks.set(sensorId, { onDataUpdate, onPointsUpdate });
      console.log(`[SensorManager] Callbacks actualizados para sensor ${sensorId}`);
    }
  }

  /**
   * Limpia todos los sensores (útil para logout)
   */
  async cleanup() {
    console.log('[SensorManager] Limpiando todos los sensores...');
    
    // Detener todos los sensores
    for (const sensorId of this.sensors.keys()) {
      await this.stopSensor(sensorId);
    }
    
    // Limpiar mapas
    this.sensors.clear();
    this.callbacks.clear();
    
    // Limpiar almacenamiento
    try {
      await AsyncStorage.removeItem(ACTIVE_SENSORS_KEY);
    } catch (error) {
      console.error('[SensorManager] Error al limpiar almacenamiento:', error);
    }
    
    // Remover listener de app state
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    
    this.isInitialized = false;
    console.log('[SensorManager] ✅ Limpieza completada');
  }
}

// Singleton instance
export const sensorManager = new SensorManager();

