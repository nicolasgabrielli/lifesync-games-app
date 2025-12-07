/**
 * Servicio para interactuar con la API de GitHub
 * Obtiene datos reales de contribuciones de GitHub
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const GITHUB_TOKEN_KEY = '@LifeSync:githubToken';
const GITHUB_USERNAME_KEY = '@LifeSync:githubUsername';
const GITHUB_API_BASE = 'https://api.github.com';

class GitHubService {
  constructor() {
    this.token = null;
    this.username = null;
  }

  /**
   * Guarda el token de GitHub
   */
  async setToken(token) {
    this.token = token;
    if (token) {
      await AsyncStorage.setItem(GITHUB_TOKEN_KEY, token);
    } else {
      await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
    }
  }

  /**
   * Obtiene el token guardado
   */
  async getToken() {
    if (this.token) {
      return this.token;
    }
    try {
      const token = await AsyncStorage.getItem(GITHUB_TOKEN_KEY);
      this.token = token;
      return token;
    } catch (error) {
      console.error('[GitHub] Error al obtener token:', error);
      return null;
    }
  }

  /**
   * Guarda el username de GitHub
   */
  async setUsername(username) {
    this.username = username;
    if (username) {
      await AsyncStorage.setItem(GITHUB_USERNAME_KEY, username);
    } else {
      await AsyncStorage.removeItem(GITHUB_USERNAME_KEY);
    }
  }

  /**
   * Obtiene el username guardado
   */
  async getUsername() {
    if (this.username) {
      return this.username;
    }
    try {
      const username = await AsyncStorage.getItem(GITHUB_USERNAME_KEY);
      this.username = username;
      return username;
    } catch (error) {
      console.error('[GitHub] Error al obtener username:', error);
      return null;
    }
  }

  /**
   * Verifica si hay credenciales configuradas
   */
  async isConfigured() {
    const token = await this.getToken();
    const username = await this.getUsername();
    return !!(token && username);
  }

  /**
   * Hace una petición a la API de GitHub
   */
  async apiRequest(endpoint, options = {}) {
    const token = await this.getToken();
    if (!token) {
      throw new Error('Token de GitHub no configurado');
    }

    const url = `${GITHUB_API_BASE}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${token}`, // GitHub recomienda Bearer para nuevos tokens
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'LifeSync-Games',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Token de GitHub inválido o expirado');
        }
        if (response.status === 404) {
          throw new Error('Usuario de GitHub no encontrado');
        }
        throw new Error(`Error de API: ${response.status} ${response.statusText}`);
      }

      // Verificar rate limit
      const remaining = response.headers.get('x-ratelimit-remaining');
      if (remaining === '0') {
        const resetTime = response.headers.get('x-ratelimit-reset');
        const resetDate = new Date(parseInt(resetTime) * 1000);
        throw new Error(`Límite de rate limit alcanzado. Se reseteará en: ${resetDate.toLocaleString()}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GitHub] Error en petición API:', error);
      throw error;
    }
  }

  /**
   * Obtiene información del usuario autenticado
   */
  async getUserInfo() {
    return await this.apiRequest('/user');
  }

  /**
   * Verifica los permisos del token
   * Retorna un objeto con los permisos disponibles y los requeridos
   */
  async verifyTokenPermissions() {
    try {
      // Obtener información del usuario autenticado
      // Esto también verifica que el token sea válido
      const userInfo = await this.getUserInfo();
      const username = await this.getUsername();
      
      if (!userInfo || !userInfo.login) {
        throw new Error('No se pudo obtener información del usuario');
      }

      // Verificar que el username coincida (si está configurado)
      if (username && userInfo.login.toLowerCase() !== username.toLowerCase()) {
        return {
          valid: false,
          canReadEvents: false,
          username: userInfo.login,
          message: `El username no coincide. El token pertenece a: ${userInfo.login}`,
          requiredScopes: ['public_repo', 'read:user'],
          optionalScopes: ['repo'],
        };
      }

      // Intentar obtener eventos públicos para verificar permisos
      // Esto requiere acceso a la API de eventos públicos
      let canReadEvents = false;
      let eventsError = null;
      try {
        const events = await this.getUserEvents(userInfo.login, 1, 1);
        canReadEvents = true;
        console.log('[GitHub] Permisos verificados: puede leer eventos públicos');
      } catch (error) {
        eventsError = error.message;
        console.warn('[GitHub] No se pueden leer eventos públicos:', error.message);
        
        // Si es un error 401 o 403, el token no tiene permisos
        if (error.message.includes('401') || error.message.includes('403') || 
            error.message.includes('inválido') || error.message.includes('expirado')) {
          canReadEvents = false;
        } else {
          // Otros errores pueden ser temporales (rate limit, etc.)
          // Intentar verificar de otra manera
          canReadEvents = true; // Asumir que tiene permisos si no es un error de autenticación
        }
      }

      // Los permisos requeridos son:
      // - public_repo (para leer repositorios públicos)
      // - read:user (para leer información del usuario)
      // - repo (opcional, para repositorios privados)
      
      const requiredScopes = ['public_repo', 'read:user'];
      const optionalScopes = ['repo'];
      
      // Verificar scopes del token usando el header X-OAuth-Scopes
      // Esto se obtiene de la respuesta de /user
      // Nota: La API de GitHub no siempre devuelve este header en todas las respuestas
      
      return {
        valid: canReadEvents && !!userInfo.login,
        username: userInfo.login,
        canReadEvents,
        message: canReadEvents 
          ? 'Token válido con permisos suficientes' 
          : `Token válido pero sin permisos para leer eventos públicos. ${eventsError || 'Asegúrate de seleccionar "public_repo" y "read:user" al crear el token.'}`,
        requiredScopes,
        optionalScopes,
      };
    } catch (error) {
      console.error('[GitHub] Error al verificar permisos:', error);
      return {
        valid: false,
        canReadEvents: false,
        username: null,
        message: error.message || 'Error al verificar permisos del token. Verifica que el token sea válido y no haya expirado.',
        requiredScopes: ['public_repo', 'read:user'],
        optionalScopes: ['repo'],
      };
    }
  }

  /**
   * Obtiene los eventos de actividad del usuario
   */
  async getUserEvents(username, page = 1, perPage = 100) {
    return await this.apiRequest(`/users/${username}/events/public?page=${page}&per_page=${perPage}`);
  }

  /**
   * Obtiene los repositorios del usuario
   */
  async getUserRepos(username, page = 1, perPage = 100) {
    return await this.apiRequest(`/users/${username}/repos?page=${page}&per_page=${perPage}&sort=updated`);
  }

  /**
   * Obtiene las contribuciones del día actual
   */
  async getTodayContributions(username) {
    try {
      const events = await this.getUserEvents(username, 1, 100);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Filtrar eventos de hoy
      const todayEvents = events.filter(event => {
        const eventDate = new Date(event.created_at);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
      });

      // Contar commits reales dentro de PushEvents
      // Un PushEvent puede tener múltiples commits en payload.commits
      let totalCommits = 0;
      const pushEvents = todayEvents.filter(event => event.type === 'PushEvent');
      
      pushEvents.forEach(event => {
        // El payload contiene un array de commits
        if (event.payload && event.payload.commits) {
          // Contar commits en este push
          totalCommits += event.payload.commits.length;
        } else {
          // Si no hay payload.commits, asumir 1 commit por PushEvent (fallback)
          totalCommits += 1;
        }
      });

      // Obtener repos únicos
      const repos = new Set();
      todayEvents.forEach(event => {
        if (event.repo && event.repo.name) {
          repos.add(event.repo.name);
        }
      });

      // Obtener el último commit
      let lastCommit = 'Nunca';
      if (pushEvents.length > 0) {
        const lastEvent = pushEvents[0];
        const lastEventDate = new Date(lastEvent.created_at);
        const now = new Date();
        const diffMs = now - lastEventDate;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) {
          lastCommit = 'Ahora';
        } else if (diffMins < 60) {
          lastCommit = `Hace ${diffMins} min`;
        } else if (diffHours < 24) {
          lastCommit = `Hace ${diffHours}h`;
        } else {
          lastCommit = lastEventDate.toLocaleString('es-ES', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      }

      console.log(`[GitHub] Contribuciones de hoy: ${totalCommits} commits en ${pushEvents.length} push(es)`);

      return {
        commits: totalCommits,
        repos: repos.size,
        lastCommit,
        events: todayEvents,
      };
    } catch (error) {
      console.error('[GitHub] Error al obtener contribuciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene el número total de commits en los últimos 30 días
   */
  async getRecentCommits(username, days = 30) {
    try {
      const events = await this.getUserEvents(username, 1, 100);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const recentEvents = events.filter(event => {
        const eventDate = new Date(event.created_at);
        return eventDate >= cutoffDate && event.type === 'PushEvent';
      });

      return recentEvents.length;
    } catch (error) {
      console.error('[GitHub] Error al obtener commits recientes:', error);
      return 0;
    }
  }

  /**
   * Limpia las credenciales guardadas
   */
  async clearCredentials() {
    this.token = null;
    this.username = null;
    await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
    await AsyncStorage.removeItem(GITHUB_USERNAME_KEY);
  }
}

// Singleton instance
export const githubService = new GitHubService();

