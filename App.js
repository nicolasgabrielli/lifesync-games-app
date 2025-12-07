// Importar gesture-handler PRIMERO, antes que cualquier otra cosa
import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, AppState } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import HomeScreen from './screens/HomeScreen';
import SensorsScreen from './screens/SensorsScreen';
import SensorDetailScreen from './screens/SensorDetailScreen';
import LoginScreen from './screens/LoginScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeSensors } from './config/sensors';
import { getSensorPoints } from './services/sensorStorage';
import { sensorManager } from './services/sensorManager';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function SensorsStack({ sensors }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a2e',
        },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen
        name="SensorsList"
        options={{ headerShown: false }}
      >
        {(props) => <SensorsScreen {...props} sensors={sensors} />}
      </Stack.Screen>
      <Stack.Screen
        name="SensorDetail"
        component={SensorDetailScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#ff6b35',
    accent: '#ff6b35',
    background: '#1a1a2e',
    surface: '#2d3561',
    text: '#ffffff',
  },
};

function AppNavigator() {
  let authContext;
  try {
    authContext = useAuth();
  } catch (error) {
    console.error('[App] Error al obtener contexto de autenticación:', error);
    // Retornar pantalla de error si no se puede obtener el contexto
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }
  
  const { isAuthenticated, isLoading, userPoints } = authContext;
  const [sensors, setSensors] = useState(() => {
    try {
      return initializeSensors();
    } catch (error) {
      console.error('[App] Error al inicializar sensores:', error);
      return []; // Retornar array vacío si hay error
    }
  });
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);

  // Inicializar servicio global de sensores y cargar puntos guardados
  useEffect(() => {
    const initialize = async () => {
      console.log('[App] Iniciando inicialización de sensores...');
      try {
        // Inicializar el servicio global de sensores con timeout
        const initPromise = sensorManager.initialize();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SensorManager initialization timeout')), 5000)
        );
        
        await Promise.race([initPromise, timeoutPromise]);
        console.log('[App] SensorManager inicializado');
        
        // Cargar puntos guardados con timeout
        const loadPointsPromise = loadSensorPoints();
        const loadTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Load sensor points timeout')), 3000)
        );
        
        await Promise.race([loadPointsPromise, loadTimeoutPromise]);
        console.log('[App] Puntos de sensores cargados');
      } catch (error) {
        console.error('[App] Error al inicializar aplicación:', error);
        // No lanzar el error, solo registrarlo para que la app pueda seguir funcionando
      }
    };
    initialize();
  }, []);

  // Mantener la app activa en background para que los sensores sigan funcionando
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[App] App volvió al primer plano');
      } else if (appState.current === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('[App] App fue a segundo plano - Los sensores continúan funcionando mediante el servicio de accesibilidad');
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, []);

  const loadSensorPoints = async () => {
    try {
      const savedPoints = await getSensorPoints();
      setSensors(prevSensors => 
        prevSensors.map(sensor => {
          try {
            const sensorData = savedPoints[sensor.id];
            let lastUpdate = 'Nunca';
            
            if (sensorData?.lastUpdate) {
              try {
                const date = new Date(sensorData.lastUpdate);
                if (!isNaN(date.getTime())) {
                  lastUpdate = date.toLocaleString('es-ES');
                }
              } catch (dateError) {
                console.warn(`[App] Error al parsear fecha para sensor ${sensor.id}:`, dateError);
              }
            }
            
            return {
              ...sensor,
              lastPoints: sensorData?.points || 0,
              lastUpdate,
            };
          } catch (sensorError) {
            console.error(`[App] Error al procesar sensor ${sensor.id}:`, sensorError);
            return sensor; // Retornar sensor sin cambios si hay error
          }
        })
      );
    } catch (error) {
      console.error('[LifeSync] Error al cargar puntos de sensores:', error);
      // No lanzar el error, permitir que la app continúe con valores por defecto
    }
  };

  if (isLoading) {
    console.log('[App] Mostrando pantalla de carga...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }
  
  console.log('[App] isLoading = false, isAuthenticated =', isAuthenticated);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Calcular el padding bottom del tabBar respetando el área segura de Android
  // Padding interno del contenido (para que el texto no esté pegado al borde)
  const contentPaddingBottom = 12;
  // Espacio adicional para los botones de navegación de Android
  const androidNavPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 0)
    : 0;
  // Padding total inferior = padding interno + espacio de Android
  const tabBarPaddingBottom = contentPaddingBottom + androidNavPadding;
  // Altura base del contenido (iconos + texto con su espaciado)
  const baseHeight = 56; // Altura del contenido reducida
  const tabBarHeight = baseHeight + tabBarPaddingBottom;

  return (
    <NavigationContainer
      onError={(error) => {
        console.error('[App] Error de navegación:', error);
        // No lanzar el error, solo registrarlo
      }}
    >
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1a1a2e',
          },
          headerTintColor: '#fff',
          tabBarStyle: {
            backgroundColor: '#1a1a2e',
            borderTopColor: '#2d3561',
            borderTopWidth: 1,
            height: tabBarHeight,
            paddingTop: -10,
            paddingBottom: androidNavPadding, // Solo el espacio de los botones de Android
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            
          },
          tabBarActiveTintColor: '#ff6b35',
          tabBarInactiveTintColor: '#cccccc',
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: '700',
            marginBottom: 0,
            letterSpacing: 0.3,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
          },
          tabBarHideOnKeyboard: false,
        }}
      >
        <Tab.Screen
          name="Home"
          options={{
            headerShown: false,
            tabBarLabel: 'Inicio',
            tabBarIcon: () => null,
          }}
        >
          {(props) => <HomeScreen {...props} userPoints={userPoints} />}
        </Tab.Screen>
        
        <Tab.Screen
          name="Sensors"
          options={{
            headerShown: false,
            tabBarLabel: 'Sensores',
            tabBarIcon: () => null,
          }}
        >
          {(props) => <SensorsStack {...props} sensors={sensors} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="light" />
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
