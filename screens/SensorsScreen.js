import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import SensorCard from '../components/SensorCard';
import { getSensorPoints } from '../services/sensorStorage';
import { useSensor } from '../hooks/useSensor';

// Componente wrapper para cada sensor que usa el hook useSensor
function SensorCardWrapper({ sensor, navigation, forceRefresh }) {
  const { isActive, toggleActive, isLoading, syncState } = useSensor(sensor);
  const [sensorData, setSensorData] = useState({
    ...sensor,
    isActive,
  });
  const [syncKey, setSyncKey] = useState(0);

  // Sincronizar estado cuando se fuerza actualización
  useEffect(() => {
    if (forceRefresh && syncState) {
      // Ejecutar sincronización después de un pequeño delay para asegurar que el sensorManager tenga el estado actualizado
      const timer = setTimeout(() => {
        syncState();
        // Forzar actualización del componente
        setSyncKey(prev => prev + 1);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [forceRefresh, syncState]);

  // Actualizar sensorData cuando cambia isActive
  useEffect(() => {
    setSensorData(prev => ({
      ...prev,
      isActive,
    }));
  }, [isActive, syncKey]);

  // Actualizar puntos periódicamente
  useEffect(() => {
    const updatePoints = async () => {
      try {
        const savedPoints = await getSensorPoints();
        setSensorData(prev => ({
          ...prev,
          lastPoints: savedPoints[sensor.id]?.points || prev.lastPoints || 0,
          lastUpdate: savedPoints[sensor.id]?.lastUpdate
            ? new Date(savedPoints[sensor.id].lastUpdate).toLocaleString('es-ES')
            : prev.lastUpdate || 'Nunca',
        }));
      } catch (error) {
        console.error('[LifeSync] Error al actualizar puntos:', error);
      }
    };

    updatePoints();
    const interval = setInterval(updatePoints, 3000);

    return () => clearInterval(interval);
  }, [sensor.id]);

  const handleSensorPress = () => {
    navigation.navigate('SensorDetail', { sensor });
  };

  return (
    <SensorCard
      sensor={sensorData}
      onPress={handleSensorPress}
      onToggle={toggleActive}
      isLoading={isLoading}
    />
  );
}

export default function SensorsScreen({ sensors, navigation }) {
  const insets = useSafeAreaInsets();
  const [refreshKey, setRefreshKey] = useState(0);

  // Sincronizar estado cuando la pantalla se enfoca
  useFocusEffect(
    React.useCallback(() => {
      // Pequeño delay para asegurar que el sensorManager tenga el estado actualizado
      // después de navegar desde la pantalla de detalle
      const timer = setTimeout(() => {
        // Forzar actualización de todos los sensores para sincronizar estado
        setRefreshKey(prev => prev + 1);
      }, 150);
      return () => clearTimeout(timer);
    }, [])
  );

  // Calcular padding bottom para respetar el tabBar
  const contentPaddingBottom = 12;
  const androidNavPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 0)
    : 0;
  const baseHeight = 56;
  const paddingTop = 2;
  const tabBarHeight = baseHeight + paddingTop + contentPaddingBottom + androidNavPadding;
  const listPaddingBottom = tabBarHeight + 24;

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: '#1a1a2e' }]}
      edges={['top', 'left', 'right']}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Monitoreo de Hábitos</Text>
        <Text style={styles.subtitle}>
          Activa los sensores para comenzar a ganar puntos por tus comportamientos saludables
        </Text>
      </View>
      
      <FlatList
        data={sensors}
        keyExtractor={(item) => `${item.id}-${refreshKey}`}
        extraData={refreshKey}
        renderItem={({ item }) => (
          <SensorCardWrapper
            key={`${item.id}-${refreshKey}`}
            sensor={item}
            navigation={navigation}
            forceRefresh={refreshKey > 0}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: listPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    paddingHorizontal: 4,
    paddingRight: 12,
  },
  list: {
    padding: 24,
    paddingTop: 12,
  },
});
