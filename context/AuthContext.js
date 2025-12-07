import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as apiLogin, getUserPoints } from '../services/api';

const AuthContext = createContext();

const CREDENTIALS_KEY = '@LifeSync:credentials';
const USER_ID_KEY = '@LifeSync:userId';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userPoints, setUserPoints] = useState({
    social: 0,
    fisica: 0,
    afectivo: 0,
    cognitivo: 0,
    linguistico: 0,
  });
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(null);

  // Cargar credenciales guardadas al iniciar
  useEffect(() => {
    let isMounted = true;
    
    // Timeout de seguridad: si después de 3 segundos no ha terminado, mostrar login
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('[LifeSync] Timeout de seguridad: mostrando pantalla de login');
        setIsLoading(false);
      }
    }, 3000);
    
    loadStoredCredentials().finally(() => {
      clearTimeout(safetyTimeout);
    });
    
    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Cargar puntos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadUserPoints();
    }
  }, [isAuthenticated, userId]);

  const loadStoredCredentials = async () => {
    console.log('[LifeSync] Iniciando carga de credenciales...');
    
    try {
      const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_KEY);
      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      
      console.log('[LifeSync] Credenciales encontradas:', !!storedCredentials, 'UserId:', !!storedUserId);
      
      if (storedCredentials && storedUserId) {
        try {
          const parsedCredentials = JSON.parse(storedCredentials);
          const { username: storedUsername, password } = parsedCredentials;
          
          if (!storedUsername || !password) {
            console.log('[LifeSync] Credenciales inválidas, limpiando...');
            // Credenciales inválidas, limpiar
            await AsyncStorage.multiRemove([CREDENTIALS_KEY, USER_ID_KEY]);
            return;
          }
          
          console.log('[LifeSync] Intentando login automático para:', storedUsername);
          // Intentar login automático con timeout
          const loginPromise = apiLogin(storedUsername, password);
          const timeoutLogin = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Login timeout')), 8000)
          );
          
          const result = await Promise.race([loginPromise, timeoutLogin]);
          
          if (result && result.success) {
            console.log('[LifeSync] Login automático exitoso');
            setUsername(storedUsername);
            setUserId(result.userId);
            setIsAuthenticated(true);
          } else {
            console.log('[LifeSync] Login automático falló, limpiando credenciales');
            // Si falla, limpiar credenciales
            await AsyncStorage.multiRemove([CREDENTIALS_KEY, USER_ID_KEY]);
          }
        } catch (parseError) {
          console.error('[LifeSync] Error al parsear credenciales guardadas:', parseError);
          // Limpiar credenciales corruptas
          await AsyncStorage.multiRemove([CREDENTIALS_KEY, USER_ID_KEY]);
        }
      } else {
        console.log('[LifeSync] No hay credenciales guardadas');
      }
    } catch (error) {
      console.error('[LifeSync] Error al cargar credenciales:', error);
      // No lanzar el error, permitir que la app continúe sin autenticación
    } finally {
      // Asegurar que isLoading siempre se ponga en false
      console.log('[LifeSync] Finalizando carga de credenciales, isLoading = false');
      setIsLoading(false);
    }
  };

  const loadUserPoints = async () => {
    if (!userId) return;
    
    try {
      const result = await getUserPoints(userId);
      if (result && result.success && result.points) {
        setUserPoints((prev) => ({
          social: result.points.social ?? prev.social ?? 0,
          fisica: result.points.fisica ?? prev.fisica ?? 0,
          afectivo: result.points.afectivo ?? prev.afectivo ?? 0,
          cognitivo: result.points.cognitivo ?? prev.cognitivo ?? 0,
          linguistico: result.points.linguistico ?? prev.linguistico ?? 0,
        }));
      }
    } catch (error) {
      console.error('[LifeSync] Error al cargar puntos:', error);
      // No lanzar el error, mantener puntos actuales o valores por defecto
    }
  };

  const handleLogin = async (username, password) => {
    try {
      setIsLoading(true);
      const result = await apiLogin(username, password);
      
      if (result.success) {
        // Guardar credenciales
        await AsyncStorage.setItem(
          CREDENTIALS_KEY,
          JSON.stringify({ username, password })
        );
        await AsyncStorage.setItem(USER_ID_KEY, result.userId);
        
        setUsername(username);
        setUserId(result.userId);
        setIsAuthenticated(true);
        
        // Cargar puntos después del login
        await loadUserPoints();
        
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('[LifeSync] Error en login:', error);
      return { success: false, error: 'Error al iniciar sesión' };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove([CREDENTIALS_KEY, USER_ID_KEY]);
      setIsAuthenticated(false);
      setUsername(null);
      setUserId(null);
      setUserPoints({
        social: 0,
        fisica: 0,
        afectivo: 0,
        cognitivo: 0,
        linguistico: 0,
      });
    } catch (error) {
      console.error('[LifeSync] Error al cerrar sesión:', error);
    }
  };

  const refreshPoints = async () => {
    if (userId) {
      await loadUserPoints();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        userPoints,
        username,
        userId,
        login: handleLogin,
        logout: handleLogout,
        refreshPoints,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

