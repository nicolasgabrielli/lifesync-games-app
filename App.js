import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from './context/AuthContext';
import HomeScreen from './screens/HomeScreen';
import SensorsScreen from './screens/SensorsScreen';
import SensorDetailScreen from './screens/SensorDetailScreen';
import LoginScreen from './screens/LoginScreen';
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
  const { isAuthenticated, isLoading, userPoints } = useAuth();
  const [sensors, setSensors] = useState(initializeSensors());
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);

  // Inicializar servicio global de sensores y cargar puntos guardados
  useEffect(() => {
    const initialize = async () => {
      // Inicializar el servicio global de sensores
      await sensorManager.initialize();
      // Cargar puntos guardados
      await loadSensorPoints();
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
        prevSensors.map(sensor => ({
          ...sensor,
          lastPoints: savedPoints[sensor.id]?.points || 0,
          lastUpdate: savedPoints[sensor.id]?.lastUpdate 
            ? new Date(savedPoints[sensor.id].lastUpdate).toLocaleString('es-ES')
            : 'Nunca',
        }))
      );
    } catch (error) {
      console.error('[LifeSync] Error al cargar puntos de sensores:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b35" />
      </View>
    );
  }

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
    <NavigationContainer>
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
    <PaperProvider theme={theme}>
      <StatusBar style="light" />
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </PaperProvider>
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
