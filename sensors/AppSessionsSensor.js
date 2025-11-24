/**
 * Sensor de sesiones de aplicaciones móviles
 * Monitorea el uso de apps y calcula puntos según el tipo de aplicación
 * - Apps negativas (redes sociales, juegos): descuentan puntos
 * - Apps positivas (saludables): suman puntos
 */
import { getCurrentApp as getCurrentAppFromService, getUsageStats, onAppChanged, removeAllListeners } from '../services/appUsageDetection';

// Palabras clave para categorización automática
const CATEGORIZATION_KEYWORDS = {
  // Palabras clave que indican apps NEGATIVAS
  NEGATIVE: {
    // Redes sociales
    social: ['instagram', 'facebook', 'tiktok', 'twitter', 'x.com', 'snapchat', 'whatsapp', 
             'telegram', 'discord', 'reddit', 'youtube', 'pinterest', 'linkedin', 'wechat', 
             'line', 'viber', 'messenger', 'skype', 'zoom', 'teams', 'slack', 'signal',
             'tumblr', 'flickr', 'myspace', 'periscope', 'vine', 'clubhouse', 'behance',
             'dribbble', 'deviantart', 'twitch', 'mixer', 'onlyfans', 'patreon'],
    // Juegos
    games: ['game', 'juego', 'play', 'gaming', 'gamer', 'arcade', 'puzzle', 'casino',
            'poker', 'blackjack', 'slot', 'bet', 'apuesta', 'lotto', 'lottery',
            'candy', 'crush', 'clash', 'pubg', 'fortnite', 'minecraft', 'roblox',
            'among us', 'call of duty', 'fifa', 'nba', 'madden', 'nhl', 'pes',
            'pokemon go', 'angry birds', 'temple run', 'subway surfers', 'clash of clans',
            'clash royale', 'brawl stars', 'hay day', 'boom beach', 'coc', 'cr',
            'apex', 'valorant', 'league of legends', 'wild rift', 'mobile legends',
            'free fire', 'bgmi', 'cod mobile', 'genshin impact', 'honkai', 'diablo'],
    // Entretenimiento no productivo
    entertainment: ['netflix', 'hulu', 'disney+', 'disney plus', 'prime video', 'hbo',
                   'hbo max', 'paramount', 'peacock', 'crunchyroll', 'funimation',
                   'viki', 'discovery+', 'espn', 'fox sports', 'bein sports'],
    // Apps de apuestas
    gambling: ['bet365', 'betfair', 'william hill', 'ladbrokes', 'paddy power', 'betway']
  },
  
  // Palabras clave que indican apps POSITIVAS
  POSITIVE: {
    // Educación
    education: ['duolingo', 'khan academy', 'coursera', 'udemy', 'edx', 'skillshare',
               'masterclass', 'brilliant', 'memrise', 'babbel', 'busuu', 'rosetta',
               'codecademy', 'freecodecamp', 'sololearn', 'mimo', 'grasshopper',
               'scratch', 'typing', 'touch typing', 'speed typing'],
    // Salud mental y bienestar
    wellness: ['headspace', 'calm', 'medito', 'insight timer', 'waking up', 'ten percent',
               'balance', 'simple habit', 'smiling mind', 'stop breathe think', 'breathe',
               'meditation', 'mindfulness', 'yoga', 'zen', 'om', 'chakra'],
    // Fitness y salud física
    fitness: ['myfitnesspal', 'strava', 'nike run', 'nike training', 'adidas running',
              'runtastic', 'runkeeper', 'endomondo', 'map my run', 'map my fitness',
              'fitbit', 'garmin', 'polar', 'samsung health', 'google fit', 'apple health',
              'seven', 'home workout', 'workout', 'fitness', 'gym', 'exercise', 'yoga',
              'pilates', 'zumba', 'dance', 'running', 'cycling', 'swimming'],
    // Productividad
    productivity: ['todoist', 'notion', 'evernote', 'onenote', 'trello', 'asana',
                   'monday', 'clickup', 'monday.com', 'wunderlist', 'things', 'omnifocus',
                   'habitica', 'forest', 'focus', 'pomodoro', 'toggl', 'rescuetime',
                   'freedom', 'cold turkey', 'stayfocusd', 'leechblock'],
    // Lectura y aprendizaje
    reading: ['kindle', 'audible', 'goodreads', 'pocket', 'medium', 'blinkist', 'summarize',
              'instapaper', 'readwise', 'read it later', 'feedly', 'inoreader', 'news',
              'book', 'ebook', 'pdf reader', 'epub'],
    // Desarrollo personal
    personal: ['habit tracker', 'habit', 'journal', 'diary', 'daylio', 'mood', 'emotion',
               'gratitude', 'reflection', 'self care', 'selfcare', 'therapy', 'counseling']
  },
  
  // Palabras clave que indican apps NEUTRAS
  NEUTRAL: {
    system: ['settings', 'configuración', 'system', 'sistema', 'phone', 'teléfono',
             'contacts', 'contactos', 'calendar', 'calendario', 'clock', 'reloj',
             'alarm', 'alarma', 'timer', 'cronómetro', 'stopwatch', 'calculator',
             'calculadora', 'notes', 'notas', 'files', 'archivos', 'file manager',
             'gallery', 'galería', 'photos', 'fotos', 'camera', 'cámara', 'video',
             'recorder', 'grabadora', 'voice', 'voz', 'recording'],
    communication: ['gmail', 'mail', 'correo', 'email', 'outlook', 'yahoo mail',
                    'protonmail', 'thunderbird', 'spark'],
    browser: ['chrome', 'safari', 'firefox', 'edge', 'opera', 'brave', 'duckduckgo',
              'browser', 'navegador', 'web', 'internet'],
    maps: ['maps', 'mapas', 'google maps', 'waze', 'here', 'mapquest', 'tomtom',
           'navigation', 'navegación', 'gps', 'directions', 'direcciones'],
    utilities: ['weather', 'clima', 'tiempo', 'translator', 'traductor', 'translate',
                'dictionary', 'diccionario', 'thesaurus', 'converter', 'convertidor']
  }
};

// Lista expandida de apps conocidas (para matching exacto más rápido)
const KNOWN_APPS = {
  NEGATIVE: [
    // Redes sociales
    'Instagram', 'Facebook', 'TikTok', 'Twitter', 'X', 'Snapchat', 'WhatsApp', 
    'Telegram', 'Discord', 'Reddit', 'YouTube', 'Pinterest', 'LinkedIn', 'WeChat', 
    'Line', 'Viber', 'Messenger', 'Skype', 'Zoom', 'Microsoft Teams', 'Slack', 'Signal',
    'Tumblr', 'Flickr', 'Twitch', 'Mixer', 'Clubhouse', 'Behance', 'Dribbble',
    // Juegos populares
    'PUBG Mobile', 'Fortnite', 'Minecraft', 'Roblox', 'Among Us', 'Call of Duty Mobile',
    'FIFA Mobile', 'NBA 2K', 'Madden NFL', 'Pokemon GO', 'Angry Birds', 'Temple Run',
    'Subway Surfers', 'Clash of Clans', 'Clash Royale', 'Brawl Stars', 'Hay Day',
    'Candy Crush Saga', 'Candy Crush Soda', 'Candy Crush Jelly', 'Farm Heroes Saga',
    'Genshin Impact', 'Honkai Impact', 'Diablo Immortal', 'League of Legends: Wild Rift',
    'Mobile Legends', 'Free Fire', 'BGMI', 'Apex Legends Mobile', 'Valorant',
    // Entretenimiento
    'Netflix', 'Hulu', 'Disney+', 'Disney Plus', 'Prime Video', 'HBO', 'HBO Max',
    'Paramount+', 'Peacock', 'Crunchyroll', 'Funimation', 'Viki', 'Discovery+',
    'ESPN', 'Fox Sports', 'beIN Sports'
  ],
  POSITIVE: [
    // Educación
    'Duolingo', 'Khan Academy', 'Coursera', 'Udemy', 'edX', 'Skillshare', 'MasterClass',
    'Brilliant', 'Memrise', 'Babbel', 'Busuu', 'Rosetta Stone', 'Codecademy', 'freeCodeCamp',
    'SoloLearn', 'Mimo', 'Grasshopper', 'Scratch', 'Typing.com', 'Touch Typing',
    // Bienestar
    'Headspace', 'Calm', 'Medito', 'Insight Timer', 'Waking Up', 'Ten Percent Happier',
    'Balance', 'Simple Habit', 'Smiling Mind', 'Stop Breathe Think', 'Breathe',
    // Fitness
    'MyFitnessPal', 'Strava', 'Nike Run Club', 'Nike Training Club', 'Adidas Running',
    'Runtastic', 'RunKeeper', 'Endomondo', 'Map My Run', 'Map My Fitness', 'Fitbit',
    'Garmin Connect', 'Polar Flow', 'Samsung Health', 'Google Fit', 'Apple Health',
    'Seven', 'Home Workout', 'Workout', 'Yoga', 'Pilates', 'Zumba',
    // Productividad
    'Todoist', 'Notion', 'Evernote', 'OneNote', 'Trello', 'Asana', 'Monday.com',
    'ClickUp', 'Wunderlist', 'Things', 'OmniFocus', 'Habitica', 'Forest', 'Focus',
    'Pomodoro', 'Toggl', 'RescueTime', 'Freedom', 'Cold Turkey', 'StayFocusd',
    // Lectura
    'Kindle', 'Audible', 'Goodreads', 'Pocket', 'Medium', 'Blinkist', 'Instapaper',
    'Readwise', 'Feedly', 'Inoreader'
  ],
  NEUTRAL: [
    'LifeSync Games', 'Gmail', 'Chrome', 'Safari', 'Firefox', 'Edge', 'Maps', 'Google Maps', 'Waze',
    'Calendar', 'Clock', 'Calculator', 'Settings', 'Camera', 'Photos', 'Files',
    'Mail', 'Outlook', 'Yahoo Mail', 'ProtonMail', 'Weather', 'Translator'
  ]
};

/**
 * Sistema inteligente de categorización de aplicaciones
 * Usa palabras clave y patrones para categorizar automáticamente apps desconocidas
 */
export class AppCategorizer {
  /**
   * Categoriza una aplicación usando múltiples estrategias
   */
  static categorize(appName) {
    if (!appName || typeof appName !== 'string') {
      return 'neutral';
    }
    
    const name = appName.toLowerCase().trim();
    
    // 0. Verificar primero si es LifeSync Games (prioridad máxima - debe ser neutra)
    if (name === 'lifesync games' || name.includes('lifesync games')) {
      return 'neutral';
    }
    
    // 1. Verificar lista de apps conocidas (matching exacto o parcial)
    const knownCategory = this.checkKnownApps(name);
    if (knownCategory) {
      return knownCategory;
    }
    
    // 2. Verificar palabras clave negativas (prioridad alta)
    if (this.matchesKeywords(name, CATEGORIZATION_KEYWORDS.NEGATIVE)) {
      return 'negative';
    }
    
    // 3. Verificar palabras clave positivas
    if (this.matchesKeywords(name, CATEGORIZATION_KEYWORDS.POSITIVE)) {
      return 'positive';
    }
    
    // 4. Verificar palabras clave neutras
    if (this.matchesKeywords(name, CATEGORIZATION_KEYWORDS.NEUTRAL)) {
      return 'neutral';
    }
    
    // 5. Por defecto, categorizar como neutra
    return 'neutral';
  }
  
  /**
   * Verifica si el nombre de la app está en la lista de apps conocidas
   */
  static checkKnownApps(name) {
    // Verificar apps negativas
    for (const app of KNOWN_APPS.NEGATIVE) {
      if (name === app.toLowerCase() || name.includes(app.toLowerCase())) {
        return 'negative';
      }
    }
    
    // Verificar apps positivas
    for (const app of KNOWN_APPS.POSITIVE) {
      if (name === app.toLowerCase() || name.includes(app.toLowerCase())) {
        return 'positive';
      }
    }
    
    // Verificar apps neutras
    for (const app of KNOWN_APPS.NEUTRAL) {
      if (name === app.toLowerCase() || name.includes(app.toLowerCase())) {
        return 'neutral';
      }
    }
    
    return null;
  }
  
  /**
   * Verifica si el nombre de la app coincide con alguna palabra clave
   */
  static matchesKeywords(name, keywordCategories) {
    for (const category in keywordCategories) {
      const keywords = keywordCategories[category];
      for (const keyword of keywords) {
        // Buscar palabra clave completa (no solo substring)
        // Ej: "game" debe coincidir con "game", "gaming", "games", pero no con "image"
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'i');
        if (regex.test(name)) {
          return true;
        }
      }
    }
    return false;
  }
}

export class AppSessionsSensor {
  constructor(sensorId, category, onDataUpdate, onPointsUpdate) {
    this.sensorId = sensorId;
    this.category = category;
    this.onDataUpdate = onDataUpdate;
    this.onPointsUpdate = onPointsUpdate;
    
    this.intervalId = null;
    this.updateInterval = 30000; // Actualizar cada 30 segundos (reducido para mejor rendimiento)
    
    // Estado del sensor
    this.currentApp = null;
    this.appStartTime = null;
    this.totalPositiveTime = 0; // Tiempo en apps positivas (segundos)
    this.totalNegativeTime = 0; // Tiempo en apps negativas (segundos)
    this.totalNeutralTime = 0; // Tiempo en apps neutras (segundos)
    this.appHistory = []; // Historial de apps usadas
    
    // Estadísticas
    this.activeApps = 0;
    this.lastApp = 'Ninguna';
    this.lastAppCategory = 'Ninguna';
    this.updateCount = 0;
    
    // Puntos acumulados (pueden ser negativos)
    this.totalPoints = 0;
    
    // Listener para cambios de app (detección real)
    this.appChangeListener = null;
    this.isRealDetection = false;
    this.backupPollingId = null; // ID del polling de respaldo
    
    // Cargar estado guardado
    this.loadSavedState();
  }

  /**
   * Carga el estado guardado del sensor
   */
  async loadSavedState() {
    // El estado se cargará desde el hook useSensor
    // Este método puede ser usado para restaurar datos adicionales si es necesario
  }

  /**
   * Restaura el estado desde datos guardados
   */
  restoreFromData(data) {
    if (data) {
      if (data.totalPoints !== undefined) {
        this.totalPoints = data.totalPoints;
      }
      if (data.positiveTime !== undefined) {
        this.totalPositiveTime = data.positiveTime * 60; // Convertir minutos a segundos
      }
      if (data.negativeTime !== undefined) {
        this.totalNegativeTime = data.negativeTime * 60; // Convertir minutos a segundos
      }
      if (data.neutralTime !== undefined) {
        this.totalNeutralTime = data.neutralTime * 60; // Convertir minutos a segundos
      }
      if (data.lastApp) {
        this.lastApp = data.lastApp;
      }
      if (data.lastAppCategory) {
        this.lastAppCategory = data.lastAppCategory;
      }
      if (data.appHistory && Array.isArray(data.appHistory)) {
        this.appHistory = data.appHistory;
        console.log(`[AppSessions] Historial restaurado: ${this.appHistory.length} entradas`);
      }
      console.log(`[AppSessions] Estado restaurado: puntos=${this.totalPoints}, positivo=${Math.floor(this.totalPositiveTime/60)}min, negativo=${Math.floor(this.totalNegativeTime/60)}min`);
    }
  }

  async start() {
    console.log('[AppSessions] ========== INICIANDO SENSOR ==========');
    console.log('[AppSessions] Iniciando sensor de sesiones de apps...');
    
    // Ejecutar diagnóstico primero
    try {
      const { diagnoseAppDetection } = require('../services/appUsageDetection');
      await diagnoseAppDetection();
    } catch (error) {
      console.warn('[AppSessions] No se pudo ejecutar diagnóstico:', error.message);
    }
    
    // Verificar si tenemos detección real disponible - REQUERIDO
    try {
      const { checkUsageStatsPermission } = require('../services/appUsageDetection');
      const permissionResult = await checkUsageStatsPermission();
      this.isRealDetection = permissionResult.granted && !permissionResult.simulationMode;
      
      console.log('[AppSessions] Resultado de permisos:', JSON.stringify(permissionResult, null, 2));
      
      if (!this.isRealDetection) {
        console.error('[AppSessions] ❌ ERROR: Permisos no otorgados. El sensor requiere permisos para funcionar.');
        throw new Error('Permisos de detección de apps no otorgados. Habilita el servicio de accesibilidad o el acceso a datos de uso.');
      }
      
      console.log('[AppSessions] ✅ Detección real habilitada');
      
      // Iniciar servicio de background para polling continuo
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.AppUsage && NativeModules.AppUsage.startBackgroundPolling) {
          await NativeModules.AppUsage.startBackgroundPolling();
          console.log('[AppSessions] ✅ Servicio de background iniciado para polling continuo');
        }
      } catch (error) {
        console.warn('[AppSessions] No se pudo iniciar servicio de background:', error.message);
      }
      
      // Configurar listener para cambios de app INMEDIATAMENTE
      console.log('[AppSessions] Configurando listener para cambios de app...');
      this.appChangeListener = onAppChanged((packageName) => {
        if (!packageName) {
          console.warn('[AppSessions] Listener recibió packageName null o undefined');
          return;
        }
        
        // Verificar si es app del sistema antes de procesar
        if (this.isSystemAppByPackage(packageName)) {
          // Ignorar apps del sistema
          return;
        }
        
        // Convertir package name a nombre legible
        const appName = this.packageNameToAppName(packageName);
        
        // Verificar nuevamente después de convertir
        if (!appName || this.isSystemApp(appName)) {
          return;
        }
        
        if (appName !== this.currentApp) {
          // Procesar cambio de app
          const currentTime = Date.now();
          if (this.currentApp && this.appStartTime) {
            const timeSpent = Math.floor((currentTime - this.appStartTime) / 1000);
            const category = this.categorizeApp(this.currentApp);
            // Solo loguear si es app positiva o negativa (no neutras)
            if (category === 'positive' || category === 'negative') {
              console.log(`[AppSessions] 🔄 Cambio: ${this.currentApp} → ${appName} | Tiempo: ${Math.floor(timeSpent / 60)}min | Categoría: ${category}`);
            }
            this.processAppTime(this.currentApp, category, timeSpent);
            // updateDataImmediately ya se llama dentro de processAppTime si es app positiva/negativa
          }
          
          // Actualizar app actual
          this.currentApp = appName;
          this.appStartTime = currentTime;
          const newCategory = this.categorizeApp(appName);
          // Solo loguear si es app positiva o negativa
          if (newCategory === 'positive' || newCategory === 'negative') {
            console.log(`[AppSessions] ✅ Nueva app: ${appName} | Categoría: ${newCategory}`);
          }
          
          // Actualizar datos inmediatamente para reflejar el cambio de app
          this.updateDataImmediately();
        }
      });
      console.log('[AppSessions] ✅ Listener de cambios de app configurado y activo');
    } catch (error) {
      console.error('[AppSessions] Error al verificar permisos:', error.message);
      throw error;
    }
    
    // Obtener app inicial si está disponible
    try {
      const initialApp = await getCurrentAppFromService();
      if (initialApp) {
        const appName = this.packageNameToAppName(initialApp);
        if (appName) {
          this.currentApp = appName;
          this.appStartTime = Date.now();
          const category = this.categorizeApp(appName);
          console.log(`[AppSessions] 📱 App inicial detectada: ${appName} | Categoría: ${category}`);
        }
      }
    } catch (error) {
      console.log('[AppSessions] No se pudo obtener app inicial:', error.message);
    }
    
    // Inicializar datos
    const initialData = {
      activeApps: 0,
      totalTime: 0,
      lastApp: this.currentApp || 'Ninguna',
      lastAppCategory: this.currentApp ? this.categorizeApp(this.currentApp) : 'Ninguna',
      positiveTime: 0,
      negativeTime: 0,
      neutralTime: 0,
      totalPoints: 0,
      appHistory: this.appHistory.slice(-50), // Incluir historial existente si hay
      isRealDetection: true,
    };
    this.onDataUpdate(initialData);
    
    // Primera actualización inmediata
    this.update();
    
    // Actualizar periódicamente usando polling como respaldo
    // Esto asegura que detectemos cambios incluso si AccessibilityService no funciona
    this.intervalId = setInterval(() => {
      this.update();
    }, this.updateInterval);
    
      // También configurar un polling más frecuente como respaldo
      // si AccessibilityService no está funcionando
      this.backupPollingId = setInterval(async () => {
        try {
          // Verificar si hemos recibido eventos recientemente
          const now = Date.now();
          const timeSinceLastEvent = now - (this.appStartTime || 0);
          
          // Si no hemos recibido eventos en los últimos 60 segundos, usar polling
          if (timeSinceLastEvent > 60000) {
            const currentApp = await getCurrentAppFromService();
            if (currentApp) {
              const appName = this.packageNameToAppName(currentApp);
              if (appName && appName !== this.currentApp) {
                const currentTime = Date.now();
                if (this.currentApp && this.appStartTime) {
                  const timeSpent = Math.floor((currentTime - this.appStartTime) / 1000);
                  const category = this.categorizeApp(this.currentApp);
                  this.processAppTime(this.currentApp, category, timeSpent);
                }
                this.currentApp = appName;
                this.appStartTime = currentTime;
              }
            }
          }
        } catch (error) {
          // Silenciar errores menores del polling
        }
      }, 15000); // Polling cada 15 segundos como respaldo (reducido para mejor rendimiento)
    
    console.log('[AppSessions] ✅ Sensor iniciado correctamente');
    return true;
  }
  
  /**
   * Convierte un package name a nombre legible de app
   */
  packageNameToAppName(packageName) {
    if (!packageName) return null;
    
    // Mapeo de package names comunes a nombres legibles
    const packageMap = {
      'com.lifesync.games': 'LifeSync Games',
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
   * Categoriza una aplicación usando el sistema inteligente
   */
  categorizeApp(appName) {
    return AppCategorizer.categorize(appName);
  }

  /**
   * Obtiene la aplicación actual en primer plano
   * REQUIERE permisos - no simula
   * Filtra apps del sistema como launchers
   */
  async getCurrentApp() {
    if (!this.isRealDetection) {
      console.warn('[AppSessions] Intento de obtener app sin permisos');
      return this.currentApp || null;
    }
    
    try {
      // Obtener la app real
      const realApp = await getCurrentAppFromService();
      if (realApp) {
        // Verificar si es app del sistema antes de convertir
        if (this.isSystemAppByPackage(realApp)) {
          // Si es app del sistema, retornar null o la última app válida conocida
          return this.currentApp || null;
        }
        
        const appName = this.packageNameToAppName(realApp);
        
        // Verificar nuevamente después de convertir (por si el nombre también indica sistema)
        if (appName && this.isSystemApp(appName)) {
          return this.currentApp || null;
        }
        
        return appName || realApp;
      }
      return null;
    } catch (error) {
      console.error('[AppSessions] Error al obtener app actual:', error.message);
      return this.currentApp || null;
    }
  }
  
  /**
   * Verifica si un package name es de una app del sistema
   */
  isSystemAppByPackage(packageName) {
    if (!packageName) return true;
    
    const packageLower = packageName.toLowerCase();
    
    // Lista de packages del sistema que deben filtrarse
    const systemPackages = [
      'com.google.android.apps.nexuslauncher',
      'com.google.android.launcher',
      'com.android.launcher',
      'com.android.launcher2',
      'com.android.launcher3',
      'com.sec.android.app.launcher',
      'com.samsung.android.app.spage',
      'com.miui.home',
      'com.huawei.android.launcher',
      'com.oneplus.launcher',
      'com.oppo.launcher',
      'com.vivo.launcher',
      'com.realme.launcher',
      'com.xiaomi.launcher',
      'com.android.settings',
      'com.android.systemui',
      'com.google.android.setupwizard',
      'com.google.android.gms',
      'com.google.android.apps',
      'com.android.permissioncontroller',
      'com.android.packageinstaller',
    ];
    
    // Verificar si el package contiene alguna palabra clave de sistema
    for (const systemPackage of systemPackages) {
      if (packageLower.includes(systemPackage) || packageLower === systemPackage) {
        return true;
      }
    }
    
    // Verificar patrones comunes de apps del sistema
    if (packageLower.startsWith('com.android.') && 
        (packageLower.includes('launcher') || 
         packageLower.includes('system') ||
         packageLower.includes('settings'))) {
      return true;
    }
    
    return false;
  }

  /**
   * Actualiza los datos inmediatamente sin verificar cambios de app
   * Útil para refrescar la UI después de procesar tiempo de app
   */
  updateDataImmediately() {
    const appCategory = this.currentApp ? this.categorizeApp(this.currentApp) : 'Ninguna';
    const totalTimeMinutes = Math.floor((this.totalPositiveTime + this.totalNegativeTime + this.totalNeutralTime) / 60);
    
    const data = {
      activeApps: this.activeApps,
      totalTime: totalTimeMinutes,
      lastApp: this.currentApp || 'Ninguna',
      lastAppCategory: appCategory,
      positiveTime: Math.floor(this.totalPositiveTime / 60), // en minutos
      negativeTime: Math.floor(this.totalNegativeTime / 60), // en minutos
      neutralTime: Math.floor(this.totalNeutralTime / 60), // en minutos
      totalPoints: this.totalPoints,
      appHistory: this.appHistory.slice(-50), // Incluir últimas 50 entradas para el resumen
      isRealDetection: true,
    };
    
    this.onDataUpdate(data);
  }

  /**
   * Actualiza los datos inmediatamente sin verificar cambios de app
   * Útil para refrescar la UI después de procesar tiempo de app
   */
  updateDataImmediately() {
    const appCategory = this.currentApp ? this.categorizeApp(this.currentApp) : 'Ninguna';
    const totalTimeMinutes = Math.floor((this.totalPositiveTime + this.totalNegativeTime + this.totalNeutralTime) / 60);
    
    const data = {
      activeApps: this.activeApps,
      totalTime: totalTimeMinutes,
      lastApp: this.currentApp || 'Ninguna',
      lastAppCategory: appCategory,
      positiveTime: Math.floor(this.totalPositiveTime / 60), // en minutos
      negativeTime: Math.floor(this.totalNegativeTime / 60), // en minutos
      neutralTime: Math.floor(this.totalNeutralTime / 60), // en minutos
      totalPoints: this.totalPoints,
      appHistory: this.appHistory.slice(-50), // Incluir últimas 50 entradas para el resumen
      isRealDetection: true,
    };
    
    this.onDataUpdate(data);
  }

  async update() {
    this.updateCount++;
    const currentTime = Date.now();
    
    // Obtener app actual (solo real, no simula)
    const newApp = await this.getCurrentApp();
    
    // Si no hay app, no actualizar
    if (!newApp) {
      return;
    }
    
    const appCategory = this.categorizeApp(newApp);
    
    // Si cambió la app, procesar el tiempo de la app anterior
    if (this.currentApp && this.currentApp !== newApp && this.appStartTime) {
      const timeSpent = Math.floor((currentTime - this.appStartTime) / 1000); // en segundos
      const prevCategory = this.categorizeApp(this.currentApp);
      // Solo loguear si es app positiva o negativa
      if (prevCategory === 'positive' || prevCategory === 'negative') {
        console.log(`[AppSessions] 🔄 Cambio: ${this.currentApp} → ${newApp} | Tiempo: ${Math.floor(timeSpent / 60)}min | Categoría: ${prevCategory}`);
      }
      this.processAppTime(this.currentApp, prevCategory, timeSpent);
    }
    
    // Actualizar app actual solo si cambió
    if (this.currentApp !== newApp) {
      this.currentApp = newApp;
      this.appStartTime = currentTime;
      // Solo loguear si es app positiva o negativa
      if (appCategory === 'positive' || appCategory === 'negative') {
        console.log(`[AppSessions] 📱 Nueva app: ${newApp} | Categoría: ${appCategory}`);
      }
    }
    
    // Calcular tiempo total
    const totalTimeMinutes = Math.floor((this.totalPositiveTime + this.totalNegativeTime + this.totalNeutralTime) / 60);
    
    // Actualizar datos
    const data = {
      activeApps: this.activeApps,
      totalTime: totalTimeMinutes,
      lastApp: this.currentApp,
      lastAppCategory: appCategory,
      positiveTime: Math.floor(this.totalPositiveTime / 60), // en minutos
      negativeTime: Math.floor(this.totalNegativeTime / 60), // en minutos
      neutralTime: Math.floor(this.totalNeutralTime / 60), // en minutos
      totalPoints: this.totalPoints,
      appHistory: this.appHistory.slice(-50), // Incluir últimas 50 entradas para el resumen
      isRealDetection: true,
    };
    
    this.lastApp = this.currentApp;
    this.lastAppCategory = appCategory;
    this.onDataUpdate(data);
    
    // Log periódico cada 20 actualizaciones (cada ~10 minutos) - reducido para mejor rendimiento
    if (this.updateCount % 20 === 0) {
      console.log(`[AppSessions] 📊 Estado: App: ${this.currentApp} | Categoría: ${appCategory} | Tiempo positivo: ${Math.floor(this.totalPositiveTime / 60)}min | Tiempo negativo: ${Math.floor(this.totalNegativeTime / 60)}min | Puntos: ${this.totalPoints}`);
    }
  }

  /**
   * Verifica si una app es del sistema y debe ser filtrada
   */
  isSystemApp(appName) {
    if (!appName) return true;
    
    const appNameLower = appName.toLowerCase();
    
    // Lista de apps del sistema que deben filtrarse
    const systemApps = [
      'launcher',
      'nexuslauncher',
      'pixellauncher',
      'onepluslauncher',
      'samsung',
      'system',
      'sistema',
      'settings',
      'configuración',
      'permissioncontroller',
      'packageinstaller',
      'package installer',
      'android system',
      'com.android',
      'com.google.android.apps',
      'com.google.android.gms',
      'com.google.android.setupwizard',
      'com.android.settings',
      'com.android.systemui',
      'com.android.launcher',
      'com.google.android.launcher',
      'com.sec.android',
      'com.samsung',
      'com.miui',
      'com.huawei',
      'com.oneplus',
      'com.oppo',
      'com.vivo',
      'com.realme',
      'com.xiaomi',
    ];
    
    // Verificar si el nombre contiene alguna palabra clave de sistema
    for (const systemApp of systemApps) {
      if (appNameLower.includes(systemApp)) {
        return true;
      }
    }
    
    // Verificar si el nombre es muy corto (probablemente sistema)
    if (appNameLower.length < 3) {
      return true;
    }
    
    return false;
  }

  /**
   * Procesa el tiempo gastado en una app y calcula puntos
   */
  processAppTime(appName, category, timeSpentSeconds) {
    // Filtrar apps del sistema - no procesarlas ni guardarlas
    if (this.isSystemApp(appName)) {
      console.log(`[AppSessions] ⏭️ App del sistema filtrada: ${appName}`);
      return;
    }
    
    const timeSpentMinutes = timeSpentSeconds / 60;
    
    // Actualizar tiempo total por categoría
    if (category === 'positive') {
      this.totalPositiveTime += timeSpentSeconds;
      
      // Sumar puntos: 1 punto por cada 5 minutos en apps positivas
      const pointsToAdd = Math.floor(timeSpentMinutes / 5);
      if (pointsToAdd > 0) {
        this.totalPoints += pointsToAdd;
        console.log(`[AppSessions] ✅ +${pointsToAdd} puntos por ${timeSpentMinutes.toFixed(1)} min en ${appName} (app positiva)`);
        this.onPointsUpdate(pointsToAdd);
      } else if (timeSpentMinutes > 0) {
        console.log(`[AppSessions] ✅ ${timeSpentMinutes.toFixed(1)} min en ${appName} (app positiva) - Sin puntos aún`);
      }
    } else if (category === 'negative') {
      this.totalNegativeTime += timeSpentSeconds;
      
      // Descontar puntos: -1 punto por cada 5 minutos en apps negativas
      const pointsToDeduct = Math.floor(timeSpentMinutes / 5);
      if (pointsToDeduct > 0) {
        this.totalPoints -= pointsToDeduct;
        console.log(`[AppSessions] ⚠️ -${pointsToDeduct} puntos por ${timeSpentMinutes.toFixed(1)} min en ${appName} (app negativa)`);
        // Usar valor negativo para descontar
        this.onPointsUpdate(-pointsToDeduct);
      } else if (timeSpentMinutes > 0) {
        console.log(`[AppSessions] ⚠️ ${timeSpentMinutes.toFixed(1)} min en ${appName} (app negativa) - Sin descuento aún`);
      }
    } else {
      // Apps neutras no afectan puntos
      this.totalNeutralTime += timeSpentSeconds;
      if (timeSpentMinutes > 0) {
        console.log(`[AppSessions] ➖ ${timeSpentMinutes.toFixed(1)} min en ${appName} (app neutra) - Sin puntos`);
      }
    }
    
    // Actualizar número de apps activas (simulado)
    this.activeApps = Math.floor((this.totalPositiveTime + this.totalNegativeTime + this.totalNeutralTime) / 300) + 1; // Aproximación
    
    // Guardar en historial SOLO si es app positiva o negativa (no neutras)
    if (category === 'positive' || category === 'negative') {
      this.appHistory.push({
        app: appName,
        category: category,
        timeSpent: timeSpentSeconds,
        timestamp: Date.now(),
      });
      
      // Mantener solo las últimas 100 entradas
      if (this.appHistory.length > 100) {
        this.appHistory.shift();
      }
      
      // Actualizar inmediatamente la UI con el nuevo historial
      this.updateDataImmediately();
    }
  }

  stop() {
    console.log('[AppSessions] Deteniendo sensor...');
    
    // Detener servicio de background
    try {
      const { NativeModules } = require('react-native');
      if (NativeModules.AppUsage && NativeModules.AppUsage.stopBackgroundPolling) {
        NativeModules.AppUsage.stopBackgroundPolling();
        console.log('[AppSessions] Servicio de background detenido');
      }
    } catch (error) {
      console.warn('[AppSessions] No se pudo detener servicio de background:', error.message);
    }
    
    // Remover listener de cambios de app
    if (this.appChangeListener) {
      this.appChangeListener();
      this.appChangeListener = null;
    }
    removeAllListeners();
    
    // Procesar tiempo de la app actual antes de detener
    if (this.currentApp && this.appStartTime) {
      const timeSpent = Math.floor((Date.now() - this.appStartTime) / 1000);
      this.processAppTime(this.currentApp, this.categorizeApp(this.currentApp), timeSpent);
    }
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.backupPollingId) {
      clearInterval(this.backupPollingId);
      this.backupPollingId = null;
    }
  }

  reset() {
    this.currentApp = null;
    this.appStartTime = null;
    this.totalPositiveTime = 0;
    this.totalNegativeTime = 0;
    this.totalNeutralTime = 0;
    this.appHistory = [];
    this.activeApps = 0;
    this.lastApp = 'Ninguna';
    this.lastAppCategory = 'Ninguna';
    this.updateCount = 0;
    this.totalPoints = 0;
  }

  /**
   * Obtiene estadísticas del sensor
   */
  getStats() {
    return {
      totalPositiveTime: this.totalPositiveTime,
      totalNegativeTime: this.totalNegativeTime,
      totalNeutralTime: this.totalNeutralTime,
      totalPoints: this.totalPoints,
      appHistory: this.appHistory,
    };
  }
}
