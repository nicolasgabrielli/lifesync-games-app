import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Surface, Text, Chip, Divider } from 'react-native-paper';

const SensorCard = ({ sensor, onPress, onToggle, isLoading }) => {
  const isActive = sensor.isActive;
  const lastPoints = sensor.lastPoints || 0;
  const lastUpdate = sensor.lastUpdate || 'Nunca';

  const handleChipPress = (e) => {
    e.stopPropagation(); // Evitar que se active el onPress del card
    if (onToggle && !isLoading) {
      onToggle();
    }
  };

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Surface style={styles.card} elevation={3}>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              {sensor.icon && <Text style={styles.icon}>{sensor.icon}</Text>}
              <Text style={styles.sensorName} numberOfLines={2}>
                {sensor.name}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={handleChipPress}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Chip
                style={[
                  styles.statusChip,
                  { backgroundColor: isActive ? '#4CAF50' : '#f44336' },
                  isLoading && styles.statusChipDisabled
                ]}
                textStyle={styles.chipText}
                compact
              >
                {isLoading ? '...' : (isActive ? 'Activo' : 'Inactivo')}
              </Chip>
            </TouchableOpacity>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.cardInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Puntos ganados</Text>
              <Text style={styles.infoValue}>{lastPoints.toLocaleString()}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Última actividad</Text>
              <Text style={styles.infoValueSmall}>{lastUpdate}</Text>
            </View>
          </View>
        </View>
      </Surface>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    backgroundColor: '#2d3561',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 22,
    paddingHorizontal: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingRight: 4,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 14,
    paddingRight: 8,
  },
  icon: {
    fontSize: 24,
    marginRight: 14,
  },
  sensorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    lineHeight: 24,
    letterSpacing: 0.2,
    paddingRight: 4,
  },
  statusChip: {
    height: 28,
    marginLeft: 8,
  },
  statusChipDisabled: {
    opacity: 0.6,
  },
  chipText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
    lineHeight: "normal"
  },
  divider: {
    backgroundColor: '#444',
    marginVertical: 14,
  },
  cardInfo: {
    marginTop: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 2,
  },
  infoLabel: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '500',
    paddingRight: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ff6b35',
    paddingLeft: 8,
    textAlign: 'right',
  },
  infoValueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ff6b35',
    paddingLeft: 8,
    textAlign: 'right',
  },
});

export default SensorCard;
