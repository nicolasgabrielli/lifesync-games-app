/**
 * Servicio de API para LifeSync Games
 * Maneja autenticación y obtención de puntos desde la API
 */

const API_BASE_URL = {
  USER: 'https://lsg.diinf.usach.cl/user-routes/',
  GET: 'https://lsg.diinf.usach.cl/get-routes/',
  POST: 'https://lsg.diinf.usach.cl/post-routes/',
};

/**
 * Realiza login del usuario
 * @param {string} username - Nombre de usuario
 * @param {string} password - Contraseña
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export const login = async (username, password) => {
  try {
    if (!username || !password) {
      return { success: false, error: 'Por favor ingresa usuario y contraseña' };
    }

    const url = `${API_BASE_URL.USER}player/${username}/${password}`;
    
    // Agregar timeout a la petición fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { success: false, error: 'Credenciales inválidas' };
      }

      const body = await response.text();
      
      // Extraer el ID del usuario del body (similar al mod de Valheim)
      const userId = body.trim().replace(/\D/g, '');
      
      if (!userId || userId === '0') {
        return { success: false, error: 'Credenciales inválidas' };
      }

      return { success: true, userId };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('[LifeSync][API] Timeout en login');
        return { success: false, error: 'Timeout. Verifica tu conexión a internet.' };
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('[LifeSync][API] Error en login:', error);
    return { success: false, error: 'Error de conexión. Verifica tu internet.' };
  }
};

/**
 * Obtiene todos los atributos (puntos) de un usuario
 * @param {string} userId - ID del usuario
 * @returns {Promise<{success: boolean, points?: Array, error?: string}>}
 */
export const getUserPoints = async (userId) => {
  try {
    if (!userId) {
      return { success: false, error: 'ID de usuario requerido' };
    }

    const url = `${API_BASE_URL.GET}player_all_attributes/${userId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { success: false, error: 'Error al obtener puntos' };
    }

    const points = await response.json();
    
    // Convertir los puntos a un formato más fácil de usar
    // Los nombres en la BD son: 'Social', 'Fisica', 'Afectivo', 'Cognitivo', 'Linguistico'
    const formattedPoints = {
      social: 0,
      fisica: 0,
      afectivo: 0,
      cognitivo: 0,
      linguistico: 0,
    };
    
    if (Array.isArray(points)) {
      points.forEach((point) => {
        // El formato de respuesta de la API es: { id_attributes, name, data }
        // También puede venir como { Id_attributes, Name, Data } desde el mod de Valheim
        const name = point.name || point.Name || '';
        const value = parseInt(point.data || point.Data || '0', 10);
        
        // Mapeo exacto según los nombres en la base de datos
        if (name === 'Social') {
          formattedPoints.social = value;
        } else if (name === 'Fisica') {
          formattedPoints.fisica = value;
        } else if (name === 'Afectivo') {
          formattedPoints.afectivo = value;
        } else if (name === 'Cognitivo') {
          formattedPoints.cognitivo = value;
        } else if (name === 'Linguistico') {
          formattedPoints.linguistico = value;
        }
      });
    }

    return { success: true, points: formattedPoints, rawPoints: points };
  } catch (error) {
    console.error('[LifeSync][API] Error al obtener puntos:', error);
    return { success: false, error: 'Error al obtener puntos' };
  }
};

/**
 * Verifica la conexión con la API
 * @returns {Promise<boolean>}
 */
export const checkConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL.USER}`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

