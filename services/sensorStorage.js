/**
 * Servicio para almacenar puntos de sensores localmente
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const SENSOR_POINTS_KEY = '@LifeSync:sensorPoints';
const SENSOR_DATA_KEY = '@LifeSync:sensorData';

/**
 * Obtiene todos los puntos de sensores guardados
 */
export const getSensorPoints = async () => {
  try {
    const data = await AsyncStorage.getItem(SENSOR_POINTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('[LifeSync] Error al obtener puntos de sensores:', error);
    return {};
  }
};

/**
 * Guarda los puntos de un sensor específico
 */
export const saveSensorPoints = async (sensorId, points, category) => {
  try {
    console.log(`[LifeSync][Storage] Guardando puntos: sensorId=${sensorId}, points=${points}, category=${category}`);
    const currentData = await getSensorPoints();
    currentData[sensorId] = {
      points,
      category,
      lastUpdate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SENSOR_POINTS_KEY, JSON.stringify(currentData));
    console.log(`[LifeSync][Storage] Puntos guardados exitosamente para sensor ${sensorId}`);
    return currentData;
  } catch (error) {
    console.error('[LifeSync] Error al guardar puntos de sensor:', error);
    return null;
  }
};

/**
 * Obtiene los puntos de un sensor específico
 */
export const getSensorPointsById = async (sensorId) => {
  try {
    const data = await getSensorPoints();
    return data[sensorId]?.points || 0;
  } catch (error) {
    console.error('[LifeSync] Error al obtener puntos del sensor:', error);
    return 0;
  }
};

/**
 * Obtiene todos los puntos agrupados por categoría
 */
export const getPointsByCategory = async () => {
  try {
    const data = await getSensorPoints();
    const categories = {
      social: 0,
      fisica: 0,
      afectivo: 0,
      cognitivo: 0,
      linguistico: 0,
    };

    Object.values(data).forEach((sensor) => {
      if (sensor.category && categories.hasOwnProperty(sensor.category)) {
        categories[sensor.category] += sensor.points || 0;
      }
    });

    return categories;
  } catch (error) {
    console.error('[LifeSync] Error al obtener puntos por categoría:', error);
    return {
      social: 0,
      fisica: 0,
      afectivo: 0,
      cognitivo: 0,
      linguistico: 0,
    };
  }
};

/**
 * Guarda datos de sensor
 */
export const saveSensorData = async (sensorId, data) => {
  try {
    const currentData = await AsyncStorage.getItem(SENSOR_DATA_KEY);
    const parsed = currentData ? JSON.parse(currentData) : {};
    parsed[sensorId] = {
      ...data,
      lastUpdate: new Date().toISOString(),
    };
    await AsyncStorage.setItem(SENSOR_DATA_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('[LifeSync] Error al guardar datos de sensor:', error);
  }
};

/**
 * Obtiene datos de sensor
 */
export const getSensorData = async (sensorId) => {
  try {
    const data = await AsyncStorage.getItem(SENSOR_DATA_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed[sensorId] || null;
    }
    return null;
  } catch (error) {
    console.error('[LifeSync] Error al obtener datos de sensor:', error);
    return null;
  }
};

/**
 * Limpia todos los datos de sensores
 */
export const clearSensorData = async () => {
  try {
    await AsyncStorage.multiRemove([SENSOR_POINTS_KEY, SENSOR_DATA_KEY]);
  } catch (error) {
    console.error('[LifeSync] Error al limpiar datos de sensores:', error);
  }
};

