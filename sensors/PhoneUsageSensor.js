/**
 * Sensor de uso del teléfono
 * Monitorea el uso del celular y descuenta puntos en horarios no saludables
 * Horarios no saludables: 22:00 - 06:00 (noche/madrugada)
 */

// Configuración de horarios saludables/no saludables
const HEALTHY_HOURS = {
  START: 6,  // 6:00 AM
  END: 22,   // 10:00 PM (22:00)
};

import { getCurrentApp as getCurrentAppFromService, onAppChanged, removeAllListeners, checkUsageStatsPermission } from '../services/appUsageDetection';

export class PhoneUsageSensor {
  constructor(sensorId, category, onDataUpdate, onPointsUpdate) {
    this.sensorId = sensorId;
    this.category = category;
    this.onDataUpdate = onDataUpdate;
    this.onPointsUpdate = onPointsUpdate;
    
    this.intervalId = null;
    this.updateInterval = 10000; // Actualizar cada 10 segundos
    
    // Estado del sensor
    this.isPhoneActive = false;
    this.phoneStartTime = null;
    this.totalUsage = 0; // minutos totales
    this.healthyUsage = 0; // minutos en horarios saludables
    this.unhealthyUsage = 0; // minutos en horarios no saludables
    this.pickups = 0; // número de veces que se desbloquea
    this.sessions = []; // historial de sesiones
    
    // Estadísticas
    this.avgSession = 0;
    this.updateCount = 0;
    this.totalPoints = 0;
    
    // Rastrear última actualización para evitar duplicados
    this.lastUpdateTime = null;
    
    // Detección real
    this.isRealDetection = false;
    this.appChangeListener = null;
    this.lastAppPackage = null;
  }

  async start() {
    console.log('[PhoneUsage] Iniciando sensor de uso del teléfono...');
    
    // Verificar si tenemos detección real disponible - REQUERIDO
    try {
      const permissionResult = await checkUsageStatsPermission();
      this.isRealDetection = permissionResult.granted && !permissionResult.simulationMode;
      
      if (!this.isRealDetection) {
        console.error('[PhoneUsage] ERROR: Permisos no otorgados. El sensor requiere permisos para funcionar.');
        throw new Error('Permisos de detección de apps no otorgados. Habilita el servicio de accesibilidad o el acceso a datos de uso.');
      }
      
      console.log('[PhoneUsage] ✅ Detección real habilitada');
      // Configurar listener para cambios de app INMEDIATAMENTE
      console.log('[PhoneUsage] Configurando listener para cambios de app...');
      this.appChangeListener = onAppChanged((packageName) => {
        if (!packageName) {
          console.warn('[PhoneUsage] Listener recibió packageName null o undefined');
          return;
        }
        
        const appName = this.packageNameToAppName(packageName);
        console.log(`[PhoneUsage] 📱 CALLBACK EJECUTADO - Aplicación activa: ${appName || packageName} (package: ${packageName})`);
        if (packageName !== this.lastAppPackage) {
          this.lastAppPackage = packageName;
          // Detectar pickup cuando cambia la app
          this.pickups++;
          console.log(`[PhoneUsage] 📲 Pickup detectado (cambio de app). Total pickups: ${this.pickups}`);
        }
      });
      console.log('[PhoneUsage] ✅ Listener de cambios de app configurado y activo');
    } catch (error) {
      console.error('[PhoneUsage] Error al verificar permisos:', error.message);
      throw error;
    }
    
    // Inicializar datos
    const initialData = {
      totalUsage: 0,
      healthyUsage: 0,
      unhealthyUsage: 0,
      pickups: 0,
      avgSession: 0,
      currentTime: this.getCurrentTimeString(),
      isHealthyHour: this.isHealthyHour(),
      totalPoints: 0,
      isRealDetection: true,
    };
    this.onDataUpdate(initialData);
    
    // Primera actualización inmediata
    this.update();
    
    // Actualizar periódicamente
    this.intervalId = setInterval(() => {
      this.update();
    }, this.updateInterval);
    
    console.log('[PhoneUsage] ✅ Sensor iniciado correctamente');
    return true;
  }
  
  /**
   * Convierte un package name a nombre legible de app
   */
  packageNameToAppName(packageName) {
    if (!packageName) return null;
    
    // Mapeo de package names comunes a nombres legibles
    const packageMap = {
      'com.instagram.android': 'Instagram',
      'com.facebook.katana': 'Facebook',
      'com.facebook.orca': 'Messenger',
      'com.whatsapp': 'WhatsApp',
      'org.telegram.messenger': 'Telegram',
      'com.twitter.android': 'Twitter',
      'com.twitter.x': 'X',
      'com.zhiliaoapp.musically': 'TikTok',
      'com.snapchat.android': 'Snapchat',
      'com.reddit.frontpage': 'Reddit',
      'com.youtube.android': 'YouTube',
      'com.duolingo': 'Duolingo',
      'com.headspace.app': 'Headspace',
      'com.strava': 'Strava',
      'com.notion.id': 'Notion',
      'com.todoist': 'Todoist',
      'com.amazon.kindle': 'Kindle',
      'com.audible.application': 'Audible',
      'com.spotify.music': 'Spotify',
      'com.netflix.mediaclient': 'Netflix',
      'com.miui.gallery': 'Galería',
      'com.android.chrome': 'Chrome',
      'com.google.android.gm': 'Gmail',
      'com.google.android.apps.maps': 'Google Maps',
    };
    
    // Buscar en el mapa
    if (packageMap[packageName]) {
      return packageMap[packageName];
    }
    
    // Si no está en el mapa, intentar extraer del package name
    const parts = packageName.split('.');
    const lastPart = parts[parts.length - 1];
    
    // Si termina en "android" o similar, tomar la parte anterior
    if (lastPart === 'android' && parts.length > 1) {
      const appPart = parts[parts.length - 2];
      // Capitalizar primera letra
      return appPart.charAt(0).toUpperCase() + appPart.slice(1);
    }
    
    // Capitalizar primera letra del último componente
    return lastPart.charAt(0).toUpperCase() + lastPart.slice(1);
  }

  /**
   * Verifica si la hora actual es saludable
   */
  isHealthyHour() {
    const now = new Date();
    const hour = now.getHours();
    return hour >= HEALTHY_HOURS.START && hour < HEALTHY_HOURS.END;
  }

  /**
   * Obtiene la hora actual como string
   */
  getCurrentTimeString() {
    const now = new Date();
    return now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Detecta si el teléfono está activo
   * Usa el módulo nativo - REQUIERE permisos
   */
  async isPhoneCurrentlyActive() {
    if (!this.isRealDetection) {
      console.warn('[PhoneUsage] Intento de detectar actividad sin permisos');
      return false;
    }
    
    try {
      // El teléfono está activo si hay una app en primer plano
      const currentApp = await getCurrentAppFromService();
      if (currentApp) {
        const appName = this.packageNameToAppName(currentApp);
        if (appName && appName !== this.lastAppPackage) {
          console.log(`[PhoneUsage] 📱 Aplicación activa: ${appName}`);
          this.lastAppPackage = currentApp;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PhoneUsage] Error al obtener app actual:', error.message);
      return false;
    }
  }

  /**
   * Detecta un "pickup" (desbloqueo del teléfono)
   * Los pickups se detectan automáticamente por el listener de cambios de app
   */
  detectPickup() {
    // Los pickups se detectan automáticamente por el listener
    // Este método ya no simula nada
    return false;
  }

  async update() {
    this.updateCount++;
    const currentTime = Date.now();
    const isCurrentlyActive = await this.isPhoneCurrentlyActive();
    const isHealthy = this.isHealthyHour();
    
    // Detectar pickups
    this.detectPickup();
    
    // Si el teléfono está activo ahora
    if (isCurrentlyActive) {
      if (!this.isPhoneActive) {
        // El teléfono acaba de activarse
        this.isPhoneActive = true;
        this.phoneStartTime = currentTime;
        const currentApp = await getCurrentAppFromService();
        const appName = currentApp ? this.packageNameToAppName(currentApp) : 'Desconocida';
        console.log(`[PhoneUsage] 📱 Teléfono activado - App: ${appName} | Horario: ${isHealthy ? '✅ Saludable' : '⚠️ NO saludable'}`);
      } else {
        // El teléfono sigue activo, calcular tiempo transcurrido
        if (this.phoneStartTime) {
          const timeSpent = Math.floor((currentTime - this.phoneStartTime) / 1000); // en segundos
          const timeSpentMinutes = timeSpent / 60;
          
          // Actualizar tiempo según horario
          if (isHealthy) {
            this.healthyUsage += timeSpentMinutes;
          } else {
            this.unhealthyUsage += timeSpentMinutes;
          }
          
          this.totalUsage = this.healthyUsage + this.unhealthyUsage;
          
          // Procesar puntos cada minuto completo
          if (timeSpent >= 60 && (!this.lastUpdateTime || currentTime - this.lastUpdateTime >= 60000)) {
            this.processUsageTime(isHealthy, 1); // 1 minuto
            this.lastUpdateTime = currentTime;
            // Reiniciar contador para el siguiente minuto
            this.phoneStartTime = currentTime;
          }
        }
      }
    } else {
      // El teléfono se desactivó
      if (this.isPhoneActive && this.phoneStartTime) {
        const timeSpent = Math.floor((currentTime - this.phoneStartTime) / 1000); // en segundos
        const timeSpentMinutes = timeSpent / 60;
        
        // Guardar sesión
        this.sessions.push({
          startTime: this.phoneStartTime,
          endTime: currentTime,
          duration: timeSpentMinutes,
          wasHealthy: this.isHealthyHour(),
        });
        
        // Mantener solo las últimas 100 sesiones
        if (this.sessions.length > 100) {
          this.sessions.shift();
        }
        
        // Procesar tiempo final
        if (timeSpentMinutes > 0) {
          this.processUsageTime(this.isHealthyHour(), timeSpentMinutes);
        }
        
        // Actualizar estadísticas
        if (this.isHealthyHour()) {
          this.healthyUsage += timeSpentMinutes;
        } else {
          this.unhealthyUsage += timeSpentMinutes;
        }
        
        this.totalUsage = this.healthyUsage + this.unhealthyUsage;
        
        const currentApp = await getCurrentAppFromService();
        const appName = currentApp ? this.packageNameToAppName(currentApp) : 'Desconocida';
        console.log(`[PhoneUsage] ⏹️ Sesión terminada: ${timeSpentMinutes.toFixed(1)} min | App: ${appName} | Horario: ${this.isHealthyHour() ? '✅ Saludable' : '⚠️ NO saludable'}`);
      }
      
      this.isPhoneActive = false;
      this.phoneStartTime = null;
    }
    
    // Calcular promedio de sesión
    if (this.sessions.length > 0) {
      const totalSessionTime = this.sessions.reduce((sum, session) => sum + session.duration, 0);
      this.avgSession = (totalSessionTime / this.sessions.length).toFixed(1);
    }
    
    // Actualizar datos
    const data = {
      totalUsage: Math.floor(this.totalUsage),
      healthyUsage: Math.floor(this.healthyUsage),
      unhealthyUsage: Math.floor(this.unhealthyUsage),
      pickups: this.pickups,
      avgSession: parseFloat(this.avgSession),
      currentTime: this.getCurrentTimeString(),
      isHealthyHour: isHealthy,
      totalPoints: this.totalPoints,
      isRealDetection: this.isRealDetection,
    };
    
    this.onDataUpdate(data);
    
    const currentApp = await getCurrentAppFromService();
    const appName = currentApp ? this.packageNameToAppName(currentApp) : 'Ninguna';
    console.log(`[PhoneUsage] 📊 Estado: Uso saludable: ${Math.floor(this.healthyUsage)}min | No saludable: ${Math.floor(this.unhealthyUsage)}min | Puntos: ${this.totalPoints} | App activa: ${appName}`);
  }

  /**
   * Procesa el tiempo de uso y calcula puntos
   */
  processUsageTime(isHealthy, minutes) {
    if (isHealthy) {
      // Horario saludable: sumar puntos moderadamente
      // 1 punto por cada 10 minutos de uso saludable
      const pointsToAdd = Math.floor(minutes / 10);
      if (pointsToAdd > 0) {
        this.totalPoints += pointsToAdd;
        console.log(`[PhoneUsage] +${pointsToAdd} puntos por ${minutes.toFixed(1)} min en horario saludable`);
        this.onPointsUpdate(pointsToAdd);
      }
    } else {
      // Horario no saludable: descontar puntos
      // -1 punto por cada 5 minutos de uso no saludable
      const pointsToDeduct = Math.floor(minutes / 5);
      if (pointsToDeduct > 0) {
        this.totalPoints -= pointsToDeduct;
        console.log(`[PhoneUsage] -${pointsToDeduct} puntos por ${minutes.toFixed(1)} min en horario NO saludable (noche/madrugada)`);
        this.onPointsUpdate(-pointsToDeduct);
      }
    }
  }

  stop() {
    console.log('[PhoneUsage] Deteniendo sensor...');
    
    // Remover listener de cambios de app
    if (this.appChangeListener) {
      this.appChangeListener();
      this.appChangeListener = null;
    }
    removeAllListeners();
    
    // Procesar tiempo final si el teléfono está activo
    if (this.isPhoneActive && this.phoneStartTime) {
      const timeSpent = Math.floor((Date.now() - this.phoneStartTime) / 1000);
      const timeSpentMinutes = timeSpent / 60;
      
      if (timeSpentMinutes > 0) {
        this.processUsageTime(this.isHealthyHour(), timeSpentMinutes);
      }
      
      if (this.isHealthyHour()) {
        this.healthyUsage += timeSpentMinutes;
      } else {
        this.unhealthyUsage += timeSpentMinutes;
      }
      
      this.totalUsage = this.healthyUsage + this.unhealthyUsage;
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.isPhoneActive = false;
    this.phoneStartTime = null;
    this.totalUsage = 0;
    this.healthyUsage = 0;
    this.unhealthyUsage = 0;
    this.pickups = 0;
    this.sessions = [];
    this.avgSession = 0;
    this.updateCount = 0;
    this.totalPoints = 0;
    this.lastUpdateTime = null;
  }

  /**
   * Restaura el estado desde datos guardados
   */
  restoreFromData(data) {
    if (data) {
      if (data.totalUsage !== undefined) {
        this.totalUsage = data.totalUsage;
      }
      if (data.healthyUsage !== undefined) {
        this.healthyUsage = data.healthyUsage;
      }
      if (data.unhealthyUsage !== undefined) {
        this.unhealthyUsage = data.unhealthyUsage;
      }
      if (data.pickups !== undefined) {
        this.pickups = data.pickups;
      }
      if (data.avgSession !== undefined) {
        this.avgSession = data.avgSession;
      }
      if (data.totalPoints !== undefined) {
        this.totalPoints = data.totalPoints;
      }
      if (data.sessions && Array.isArray(data.sessions)) {
        this.sessions = data.sessions;
      }
      console.log(`[PhoneUsage] Estado restaurado: uso saludable=${Math.floor(this.healthyUsage)}min, no saludable=${Math.floor(this.unhealthyUsage)}min, puntos=${this.totalPoints}`);
    }
  }

  /**
   * Obtiene estadísticas del sensor
   */
  getStats() {
    return {
      totalUsage: this.totalUsage,
      healthyUsage: this.healthyUsage,
      unhealthyUsage: this.unhealthyUsage,
      pickups: this.pickups,
      totalPoints: this.totalPoints,
      sessions: this.sessions,
    };
  }
}
