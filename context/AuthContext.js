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
    loadStoredCredentials();
  }, []);

  // Cargar puntos cuando el usuario está autenticado
  useEffect(() => {
    if (isAuthenticated && userId) {
      loadUserPoints();
    }
  }, [isAuthenticated, userId]);

  const loadStoredCredentials = async () => {
    try {
      const storedCredentials = await AsyncStorage.getItem(CREDENTIALS_KEY);
      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      
      if (storedCredentials && storedUserId) {
        const { username: storedUsername, password } = JSON.parse(storedCredentials);
        
        // Intentar login automático
        const result = await apiLogin(storedUsername, password);
        
        if (result.success) {
          setUsername(storedUsername);
          setUserId(result.userId);
          setIsAuthenticated(true);
        } else {
          // Si falla, limpiar credenciales
          await AsyncStorage.multiRemove([CREDENTIALS_KEY, USER_ID_KEY]);
        }
      }
    } catch (error) {
      console.error('[LifeSync] Error al cargar credenciales:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserPoints = async () => {
    if (!userId) return;
    
    try {
      const result = await getUserPoints(userId);
      if (result.success && result.points) {
        setUserPoints((prev) => ({
          social: result.points.social ?? prev.social,
          fisica: result.points.fisica ?? prev.fisica,
          afectivo: result.points.afectivo ?? prev.afectivo,
          cognitivo: result.points.cognitivo ?? prev.cognitivo,
          linguistico: result.points.linguistico ?? prev.linguistico,
        }));
      }
    } catch (error) {
      console.error('[LifeSync] Error al cargar puntos:', error);
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

