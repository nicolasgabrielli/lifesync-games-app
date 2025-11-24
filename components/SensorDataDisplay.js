import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

// Componente para mostrar datos específicos de cada tipo de sensor
const SensorDataDisplay = ({ sensorType, sensorData }) => {
  if (!sensorData) return null;

  const renderData = () => {
    switch (sensorType) {
      case 'app_sessions':
        return (
          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Última app</Text>
              <Text style={[styles.dataValue, sensorData.lastAppCategory === 'negative' && styles.negativeValue, sensorData.lastAppCategory === 'positive' && styles.positiveValue]}>
                {sensorData.lastApp}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Categoría</Text>
              <Text style={[styles.dataValue, sensorData.lastAppCategory === 'negative' && styles.negativeValue, sensorData.lastAppCategory === 'positive' && styles.positiveValue]}>
                {sensorData.lastAppCategory === 'negative' ? 'Negativa' : 
                 sensorData.lastAppCategory === 'positive' ? 'Positiva' : 'Neutra'}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Tiempo total</Text>
              <Text style={styles.dataValue}>{sensorData.totalTime} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, styles.positiveLabel]}>Apps positivas</Text>
              <Text style={[styles.dataValue, styles.positiveValue]}>{sensorData.positiveTime || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, styles.negativeLabel]}>Apps negativas</Text>
              <Text style={[styles.dataValue, styles.negativeValue]}>{sensorData.negativeTime || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Puntos del sensor</Text>
              <Text style={[styles.dataValue, (sensorData.totalPoints || 0) < 0 && styles.negativeValue, (sensorData.totalPoints || 0) > 0 && styles.positiveValue]}>
                {sensorData.totalPoints >= 0 ? '+' : ''}{sensorData.totalPoints || 0}
              </Text>
            </View>
          </View>
        );
      case 'phone_usage':
        return (
          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Hora actual</Text>
              <Text style={[styles.dataValue, sensorData.isHealthyHour ? styles.positiveValue : styles.negativeValue]}>
                {sensorData.currentTime || '--:--'}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Horario</Text>
              <Text style={[styles.dataValue, sensorData.isHealthyHour ? styles.positiveValue : styles.negativeValue]}>
                {sensorData.isHealthyHour ? 'Saludable ✓' : 'No saludable ✗'}
              </Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Uso total</Text>
              <Text style={styles.dataValue}>{sensorData.totalUsage || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, styles.positiveLabel]}>Uso saludable</Text>
              <Text style={[styles.dataValue, styles.positiveValue]}>{sensorData.healthyUsage || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, styles.negativeLabel]}>Uso no saludable</Text>
              <Text style={[styles.dataValue, styles.negativeValue]}>{sensorData.unhealthyUsage || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Desbloqueos</Text>
              <Text style={styles.dataValue}>{sensorData.pickups || 0}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Sesión promedio</Text>
              <Text style={styles.dataValue}>{sensorData.avgSession || 0} min</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Puntos del sensor</Text>
              <Text style={[styles.dataValue, (sensorData.totalPoints || 0) < 0 && styles.negativeValue, (sensorData.totalPoints || 0) > 0 && styles.positiveValue]}>
                {sensorData.totalPoints >= 0 ? '+' : ''}{sensorData.totalPoints || 0}
              </Text>
            </View>
          </View>
        );
      case 'step_count':
        return (
          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Pasos totales</Text>
              <Text style={styles.dataValue}>{sensorData.steps.toLocaleString()}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Distancia</Text>
              <Text style={styles.dataValue}>{sensorData.distance} km</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Calorías</Text>
              <Text style={styles.dataValue}>{sensorData.calories} kcal</Text>
            </View>
          </View>
        );
      case 'github_contributions':
        return (
          <View style={styles.dataContainer}>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Commits hoy</Text>
              <Text style={styles.dataValue}>{sensorData.commits}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Repositorios</Text>
              <Text style={styles.dataValue}>{sensorData.repos}</Text>
            </View>
            <View style={styles.dataRow}>
              <Text style={styles.dataLabel}>Último commit</Text>
              <Text style={styles.dataValue}>{sensorData.lastCommit}</Text>
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.dataContainer}>
            <Text style={styles.noData}>No hay datos disponibles</Text>
          </View>
        );
    }
  };

  return renderData();
};

const styles = StyleSheet.create({
  dataContainer: {
    marginTop: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    minHeight: 24,
  },
  dataLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
    paddingRight: 16,
    flexShrink: 0,
    maxWidth: '45%',
    paddingTop: 2,
  },
  dataValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ff6b35',
    paddingLeft: 8,
    textAlign: 'right',
    flex: 1,
    flexShrink: 1,
    paddingTop: 2,
  },
  noData: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    padding: 20,
  },
  positiveValue: {
    color: '#4CAF50',
  },
  negativeValue: {
    color: '#f44336',
  },
  positiveLabel: {
    color: '#4CAF50',
  },
  negativeLabel: {
    color: '#f44336',
  },
});

export default SensorDataDisplay;
