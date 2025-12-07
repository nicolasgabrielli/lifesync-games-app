/**
 * Sensor de contribuciones de GitHub
 * Obtiene datos reales de la API de GitHub
 */
import { githubService } from '../services/githubService';

export class GithubContributionsSensor {
  constructor(sensorId, category, onDataUpdate, onPointsUpdate) {
    this.sensorId = sensorId;
    this.category = category;
    this.onDataUpdate = onDataUpdate;
    this.onPointsUpdate = onPointsUpdate;
    
    this.intervalId = null;
    this.commits = 0;
    this.repos = 0;
    this.lastCommit = 'Nunca';
    this.updateCount = 0;
    this.lastCommitsProcessed = 0; // Número de commits ya procesados (para evitar duplicados)
    this.isConfigured = false;
  }

  async start() {
    console.log('[Github] Iniciando sensor de contribuciones de GitHub...');
    
    // Verificar si está configurado
    this.isConfigured = await githubService.isConfigured();
    
    if (!this.isConfigured) {
      console.warn('[Github] Sensor no configurado. Usando modo simulación.');
      // Inicializar datos por defecto
      const initialData = {
        commits: 0,
        repos: 0,
        lastCommit: 'Nunca',
        isConfigured: false,
      };
      this.onDataUpdate(initialData);
      return true;
    }
    
    // Inicializar datos
    const initialData = {
      commits: 0,
      repos: 0,
      lastCommit: 'Nunca',
      isConfigured: true,
    };
    this.onDataUpdate(initialData);
    
    // Primera actualización inmediata
    await this.update();
    
    // Actualizar cada 5 minutos (GitHub no cambia tan frecuentemente)
    // La API de GitHub tiene rate limits, así que no queremos hacer demasiadas peticiones
    this.intervalId = setInterval(() => {
      this.update();
    }, 5 * 60 * 1000); // 5 minutos
    
    console.log('[Github] Sensor iniciado correctamente');
    return true;
  }

  async update() {
    this.updateCount++;
    
    try {
      // Verificar si está configurado
      const isConfigured = await githubService.isConfigured();
      
      if (!isConfigured) {
        // Modo simulación si no está configurado
        this.updateSimulated();
        return;
      }

      const username = await githubService.getUsername();
      if (!username) {
        console.warn('[Github] Username no configurado');
        this.updateSimulated();
        return;
      }

      // Obtener contribuciones del día actual
      const contributions = await githubService.getTodayContributions(username);
      
      const previousCommits = this.commits;
      this.commits = contributions.commits;
      this.repos = contributions.repos;
      this.lastCommit = contributions.lastCommit;
      
      const data = {
        commits: this.commits,
        repos: this.repos,
        lastCommit: this.lastCommit,
        isConfigured: true,
      };
      
      this.onDataUpdate(data);
      
      // Calcular puntos: 2 puntos por cada commit
      // Solo agregar puntos si hay commits nuevos (evitar duplicados)
      // Comparar con los commits ya procesados, no con los puntos
      const newCommits = this.commits - this.lastCommitsProcessed;
      
      if (newCommits > 0) {
        const pointsToAdd = newCommits * 2; // 2 puntos por commit nuevo
        console.log(`[Github] Actualización #${this.updateCount}: ${newCommits} commits nuevos = ${pointsToAdd} puntos (Total commits hoy: ${this.commits})`);
        this.onPointsUpdate(pointsToAdd);
        this.lastCommitsProcessed = this.commits;
      } else if (this.commits !== previousCommits) {
        // Si los commits cambiaron pero no hay commits nuevos, podría ser un reset
        // Esto puede pasar si el día cambió o si se reinició el sensor
        console.log(`[Github] Commits detectados: ${this.commits} (ya procesados: ${this.lastCommitsProcessed})`);
        // Si los commits actuales son mayores que los procesados, hay commits nuevos
        if (this.commits > this.lastCommitsProcessed) {
          const newCommits = this.commits - this.lastCommitsProcessed;
          const pointsToAdd = newCommits * 2;
          console.log(`[Github] Detectados ${newCommits} commits nuevos después de reinicio: ${pointsToAdd} puntos`);
          this.onPointsUpdate(pointsToAdd);
          this.lastCommitsProcessed = this.commits;
        }
      }
    } catch (error) {
      console.error('[Github] Error al actualizar contribuciones:', error);
      
      // En caso de error, usar datos simulados como fallback
      this.updateSimulated();
      
      // Notificar el error en los datos
      const errorData = {
        commits: this.commits,
        repos: this.repos,
        lastCommit: this.lastCommit,
        isConfigured: true,
        error: error.message,
      };
      this.onDataUpdate(errorData);
    }
  }

  updateSimulated() {
    // Modo simulación cuando no está configurado o hay error
    const timeAgo = ['Hace 2 horas', 'Hace 1 hora', 'Hace 30 min', 'Hace 15 min', 'Hace 5 min', 'Ahora'];
    this.commits = Math.floor(Math.random() * 8) + 1;
    this.repos = Math.floor(Math.random() * 4) + 1;
    this.lastCommit = timeAgo[Math.floor(Math.random() * timeAgo.length)];
    
    const data = {
      commits: this.commits,
      repos: this.repos,
      lastCommit: this.lastCommit,
      isConfigured: false,
    };
    
    this.onDataUpdate(data);
    
    // No agregar puntos en modo simulación
  }

  stop() {
    console.log('[Github] Deteniendo sensor...');
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.commits = 0;
    this.repos = 0;
    this.lastCommit = 'Nunca';
    this.updateCount = 0;
    this.lastCommitsProcessed = 0;
  }

  getStats() {
    return {
      commits: this.commits,
      repos: this.repos,
      lastCommit: this.lastCommit,
      isConfigured: this.isConfigured,
    };
  }
}

