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
      'Authorization': `token ${token}`,
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
      // Hacer una petición para obtener información del token
      // La API de GitHub no tiene un endpoint directo para verificar permisos,
      // pero podemos intentar hacer operaciones y ver qué funciona
      const userInfo = await this.getUserInfo();
      const username = await this.getUsername();
      
      // Intentar obtener eventos públicos (no requiere permisos especiales)
      let canReadEvents = false;
      try {
        await this.getUserEvents(username, 1, 1);
        canReadEvents = true;
      } catch (error) {
        canReadEvents = false;
      }

      // Los permisos requeridos son:
      // - public_repo (para leer repositorios públicos)
      // - read:user (para leer información del usuario)
      // - repo (opcional, para repositorios privados)
      
      const requiredScopes = ['public_repo', 'read:user'];
      const optionalScopes = ['repo'];
      
      return {
        valid: canReadEvents,
        username: userInfo.login,
        canReadEvents,
        message: canReadEvents 
          ? 'Token válido con permisos suficientes' 
          : 'Token válido pero sin permisos para leer eventos públicos',
        requiredScopes,
        optionalScopes,
      };
    } catch (error) {
      return {
        valid: false,
        canReadEvents: false,
        message: error.message || 'Error al verificar permisos del token',
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

      // Contar commits (PushEvent)
      const commits = todayEvents.filter(event => event.type === 'PushEvent').length;

      // Obtener repos únicos
      const repos = new Set();
      todayEvents.forEach(event => {
        if (event.repo && event.repo.name) {
          repos.add(event.repo.name);
        }
      });

      // Obtener el último commit
      let lastCommit = 'Nunca';
      const pushEvents = todayEvents.filter(event => event.type === 'PushEvent');
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

      return {
        commits,
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

