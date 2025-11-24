/**
 * Sensor de conteo de pasos usando acelerómetro
 * Detecta pasos reales basándose en el movimiento del dispositivo
 */
import { Accelerometer } from 'expo-sensors';

export class StepCounterSensor {
  constructor(sensorId, category, onDataUpdate, onPointsUpdate) {
    this.sensorId = sensorId;
    this.category = category;
    this.onDataUpdate = onDataUpdate;
    this.onPointsUpdate = onPointsUpdate;
    
    this.subscription = null;
    this.stepCount = 0;
    this.lastAccel = { x: 0, y: 0, z: 0 };
    this.lastMagnitude = 0;
    this.stepThreshold = 0.12; // Umbral ajustado para reducir falsos positivos (en g)
    this.minStepInterval = 200; // Intervalo mínimo para pasos humanos normales (ms)
    this.maxStepInterval = 2000; // Máximo tiempo entre pasos (ms) - para evitar detección de pasos muy lentos
    this.lastStepTime = 0;
    this.magnitudeHistory = [];
    this.historySize = 3; // Historial pequeño para respuesta rápida
    this.lastPeakMagnitude = 0;
    
    // Detección de vehículos: analizar patrones de movimiento
    this.accelerationHistory = []; // Historial de aceleraciones para detectar vehículos
    this.accelerationHistorySize = 20; // Tamaño del historial para análisis
    this.isInVehicle = false; // Flag para indicar si está en un vehículo
    this.vehicleDetectionThreshold = 0.05; // Umbral de variabilidad para detectar vehículos
    
    // Cargar pasos guardados
    this.loadSavedSteps();
  }

  async loadSavedSteps() {
    // Los pasos guardados se cargarán desde el hook
  }
  
  // Método para restaurar el estado desde datos guardados
  restoreFromData(data) {
    if (data && data.steps) {
      this.stepCount = data.steps;
      console.log(`[StepCounter] Estado restaurado: ${this.stepCount} pasos`);
    }
  }

  async start() {
    try {
      console.log('[StepCounter] Iniciando sensor de pasos...');
      
      // Verificar disponibilidad
      const isAvailable = await Accelerometer.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('El acelerómetro no está disponible en este dispositivo');
      }

      // Configurar frecuencia de actualización para detección de pasos humanos
      Accelerometer.setUpdateInterval(50); // 50ms - suficiente para detectar pasos humanos (20Hz)

      // Inicializar datos
      const initialData = {
        steps: this.stepCount,
        distance: (this.stepCount * 0.7 / 1000).toFixed(2),
        calories: Math.floor(this.stepCount * 0.04),
      };
      this.onDataUpdate(initialData);

      // Resetear estado de detección
      this.lastMagnitude = 0;
      this.magnitudeHistory = [];
      this.lastStepTime = Date.now(); // Inicializar con tiempo actual, no 0
      this.lastPeakMagnitude = 0;
      this.accelerationHistory = [];
      this.isInVehicle = false;

      // Suscribirse a actualizaciones del acelerómetro
      this.subscription = Accelerometer.addListener(({ x, y, z }) => {
        this.processAccelerometerData(x, y, z);
      });

      // Marcar como activo para que sensorManager pueda detectarlo
      this.isActive = true;

      console.log('[StepCounter] Sensor de pasos iniciado correctamente');
      return true;
    } catch (error) {
      console.error('[StepCounter] Error al iniciar:', error);
      throw error;
    }
  }

  processAccelerometerData(x, y, z) {
    const currentTime = Date.now();
    
    // En Expo, el acelerómetro devuelve valores en g (1.0 = 9.8 m/s²)
    // Algoritmo mejorado para detectar pasos humanos reales:
    // 1. Detectar pico de aceleración (cuando el pie toca el suelo)
    // 2. Detectar valle después del pico (movimiento hacia arriba)
    // 3. Validar que el patrón sea consistente con un paso humano
    
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    // Guardar en historial para suavizar
    this.magnitudeHistory.push(magnitude);
    if (this.magnitudeHistory.length > this.historySize) {
      this.magnitudeHistory.shift();
    }

    // Necesitamos un historial completo para tener datos suavizados
    if (this.magnitudeHistory.length < this.historySize) {
      this.lastAccel = { x, y, z };
      this.lastMagnitude = magnitude;
      return;
    }

    // Calcular promedio del historial para suavizar (reduce ruido)
    const avgMagnitude = this.magnitudeHistory.reduce((a, b) => a + b, 0) / this.magnitudeHistory.length;
    
    // Guardar en historial de aceleraciones para detectar vehículos
    this.accelerationHistory.push(avgMagnitude);
    if (this.accelerationHistory.length > this.accelerationHistorySize) {
      this.accelerationHistory.shift();
    }
    
    // Detectar si está en un vehículo basándose en el patrón de aceleración
    // Los vehículos generan vibraciones constantes y regulares
    // Los pasos humanos tienen patrones más irregulares y variables
    if (this.accelerationHistory.length >= this.accelerationHistorySize) {
      this.detectVehicleMovement();
    }
    
    // Calcular cambio en la magnitud
    const magnitudeChange = avgMagnitude - this.lastMagnitude;
    const timeSinceLastStep = currentTime - this.lastStepTime;
    
    // Algoritmo simplificado para detectar pasos humanos:
    // Detecta cambios bruscos en la aceleración que son típicos de pasos
    // Usa un enfoque más directo: detecta picos de aceleración significativos
    
    const absMagnitudeChange = Math.abs(magnitudeChange);
    
    // Manejar el caso cuando es la primera lectura (lastStepTime podría ser 0 o muy antiguo)
    const isFirstReading = this.lastStepTime === 0 || timeSinceLastStep > 10000;
    if (isFirstReading) {
      this.lastStepTime = currentTime;
      this.lastMagnitude = avgMagnitude;
      this.lastAccel = { x, y, z };
      return;
    }
    
    // Log periódico para debugging (cada 50 lecturas o cuando hay movimiento significativo)
    if (this.stepCount === 0 || this.stepCount % 50 === 0 || absMagnitudeChange > 0.1) {
      console.log(`[StepCounter] Magnitud: ${avgMagnitude.toFixed(3)}g, Cambio: ${absMagnitudeChange.toFixed(3)}g, Tiempo desde último: ${timeSinceLastStep}ms`);
    }
    
    // Detectar paso cuando hay un cambio significativo en la magnitud
    // Algoritmo ajustado para reducir falsos positivos y mejorar precisión
    
    // NO detectar pasos si está en un vehículo
    if (this.isInVehicle) {
      // Log ocasional para indicar que se está filtrando por vehículo
      if (this.stepCount % 100 === 0 && absMagnitudeChange > this.stepThreshold) {
        console.log(`[StepCounter] Movimiento detectado pero ignorado (en vehículo)`);
      }
      this.lastMagnitude = avgMagnitude;
      this.lastAccel = { x, y, z };
      return;
    }
    
    // Si es el primer paso o ha pasado mucho tiempo, permitir detección más fácil
    const isFirstStep = this.stepCount === 0;
    const hasLongInterval = timeSinceLastStep > 3000; // Si pasó más de 3 segundos, permitir detección
    
    // Verificar cambio significativo
    if (absMagnitudeChange > this.stepThreshold) {
      // Lógica más estricta para reducir falsos positivos:
      // 1. Primer paso: requiere cambio significativo y magnitud razonable
      // 2. Después de pausa larga: requiere cambio significativo y magnitud razonable
      // 3. Pasos normales: requiere intervalo mínimo estricto (200ms) y cambio significativo
      // 4. Cambios muy grandes (>0.18g) pueden tener intervalo más corto pero no menos de 150ms
      const isLargeChange = absMagnitudeChange > 0.18;
      const hasValidInterval = timeSinceLastStep > this.minStepInterval && timeSinceLastStep < this.maxStepInterval;
      const canDetectStep = isFirstStep || hasLongInterval || hasValidInterval || 
                           (isLargeChange && timeSinceLastStep > 150); // Cambios muy grandes permiten intervalo mínimo de 150ms
      
      if (canDetectStep) {
        // Verificar que la magnitud sea razonable (filtra movimientos muy pequeños)
        // Aumentado el umbral para reducir falsos positivos
        // La magnitud debe estar en un rango razonable para pasos humanos
        if (avgMagnitude > 0.5 && avgMagnitude < 2.0) { // Rango más estricto: 0.5g - 2.0g
          this.stepCount++;
          this.lastStepTime = currentTime;
          
          console.log(`[StepCounter] ¡Paso detectado! Total: ${this.stepCount}, Cambio: ${absMagnitudeChange.toFixed(3)}g, Magnitud: ${avgMagnitude.toFixed(3)}g, Tiempo: ${timeSinceLastStep}ms`);
          
          // Calcular puntos: 1 punto por cada 500 pasos
          const newPoints = Math.floor(this.stepCount / 500);
          const previousPoints = Math.floor((this.stepCount - 1) / 500);
          const pointsToAdd = newPoints - previousPoints;
          
          if (pointsToAdd > 0) {
            console.log(`[StepCounter] Puntos agregados: ${pointsToAdd} (Total puntos: ${newPoints})`);
            this.onPointsUpdate(pointsToAdd);
          }
          
          // Actualizar datos cada paso (para feedback inmediato)
          const distance = (this.stepCount * 0.7 / 1000).toFixed(2); // km (promedio 0.7m por paso)
          const calories = Math.floor(this.stepCount * 0.04); // ~0.04 calorías por paso
          
          const data = {
            steps: this.stepCount,
            distance: distance,
            calories: calories,
          };
          
          this.onDataUpdate(data);
        } else {
          // Log solo si el cambio es significativo pero la magnitud está fuera de rango
          if (absMagnitudeChange > 0.15) {
            console.log(`[StepCounter] Cambio detectado (${absMagnitudeChange.toFixed(3)}g) pero magnitud fuera de rango: ${avgMagnitude.toFixed(3)}g (rango: 0.5g - 2.0g)`);
          }
        }
      } else if (!isFirstStep && !hasLongInterval) {
        // Log solo cambios muy significativos que se rechazan
        if (absMagnitudeChange > 0.18 && timeSinceLastStep < this.minStepInterval) {
          // Cambios muy grandes rechazados por intervalo corto
          console.log(`[StepCounter] Cambio muy grande (${absMagnitudeChange.toFixed(3)}g) pero intervalo muy corto: ${timeSinceLastStep}ms (mínimo: ${this.minStepInterval}ms)`);
        }
      }
    }

    this.lastMagnitude = avgMagnitude;
    this.lastAccel = { x, y, z };
  }

  stop() {
    console.log(`[StepCounter] Deteniendo sensor de pasos... Total pasos: ${this.stepCount}`);
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
    // Marcar como inactivo
    this.isActive = false;
    // Guardar estado final
    const data = {
      steps: this.stepCount,
      distance: (this.stepCount * 0.7 / 1000).toFixed(2),
      calories: Math.floor(this.stepCount * 0.04),
    };
    this.onDataUpdate(data);
  }

  getStepCount() {
    return this.stepCount;
  }

  setStepCount(count) {
    this.stepCount = count;
  }

  reset() {
    this.stepCount = 0;
    this.lastAccel = { x: 0, y: 0, z: 0 };
    this.lastMagnitude = 0;
    this.magnitudeHistory = [];
    this.lastStepTime = 0;
    this.lastPeakMagnitude = 0;
    this.accelerationHistory = [];
    this.isInVehicle = false;
  }

  /**
   * Detecta si el usuario está en un vehículo basándose en el patrón de aceleración
   * Los vehículos generan vibraciones constantes y regulares
   * Los pasos humanos tienen patrones más irregulares y variables
   */
  detectVehicleMovement() {
    if (this.accelerationHistory.length < this.accelerationHistorySize) {
      return;
    }

    // Calcular la variabilidad de la aceleración
    // En vehículos, la variabilidad es baja (movimiento constante)
    // En pasos humanos, la variabilidad es alta (picos y valles)
    const mean = this.accelerationHistory.reduce((a, b) => a + b, 0) / this.accelerationHistory.length;
    const variance = this.accelerationHistory.reduce((sum, val) => {
      return sum + Math.pow(val - mean, 2);
    }, 0) / this.accelerationHistory.length;
    const stdDev = Math.sqrt(variance);

    // Calcular el rango de valores (diferencia entre máximo y mínimo)
    const maxAccel = Math.max(...this.accelerationHistory);
    const minAccel = Math.min(...this.accelerationHistory);
    const range = maxAccel - minAccel;

    // Calcular la frecuencia de cambios significativos
    // En vehículos, hay muchos cambios pequeños y constantes
    // En pasos humanos, hay menos cambios pero más grandes
    let significantChanges = 0;
    for (let i = 1; i < this.accelerationHistory.length; i++) {
      const change = Math.abs(this.accelerationHistory[i] - this.accelerationHistory[i - 1]);
      if (change > 0.05) { // Cambio significativo
        significantChanges++;
      }
    }
    const changeFrequency = significantChanges / this.accelerationHistory.length;

    // Criterios para detectar vehículo:
    // 1. Baja variabilidad (desviación estándar baja)
    // 2. Rango pequeño (valores cercanos entre sí)
    // 3. Alta frecuencia de cambios pequeños (vibraciones constantes)
    // 4. Magnitud promedio relativamente estable (no muchos picos grandes)
    const lowVariability = stdDev < this.vehicleDetectionThreshold;
    const smallRange = range < 0.3;
    const highChangeFrequency = changeFrequency > 0.6; // Más del 60% de las lecturas tienen cambios
    const stableMagnitude = mean > 0.8 && mean < 1.3; // Magnitud en rango de gravedad + vibración

    // Si cumple varios criterios, probablemente está en un vehículo
    const vehicleIndicators = [lowVariability, smallRange, highChangeFrequency, stableMagnitude].filter(Boolean).length;
    
    if (vehicleIndicators >= 3) {
      if (!this.isInVehicle) {
        console.log(`[StepCounter] Vehículo detectado - pausando conteo de pasos (variabilidad: ${stdDev.toFixed(3)}g, rango: ${range.toFixed(3)}g)`);
      }
      this.isInVehicle = true;
    } else {
      if (this.isInVehicle) {
        console.log(`[StepCounter] Vehículo no detectado - reanudando conteo de pasos`);
      }
      this.isInVehicle = false;
    }
  }
}
