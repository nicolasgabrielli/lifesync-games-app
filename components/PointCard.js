import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Surface, Text } from 'react-native-paper';

const PointCard = ({ category, points, color, icon }) => {
  return (
    <Surface style={[styles.pointCard, { backgroundColor: color }]} elevation={4}>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.categoryText}>{category}</Text>
          {icon && <Text style={styles.icon}>{icon}</Text>}
        </View>
        <Text style={styles.pointsText}>{points.toLocaleString()}</Text>
      </View>
    </Surface>
  );
};

const styles = StyleSheet.create({
  pointCard: {
    width: '48%',
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 20,
    paddingHorizontal: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingRight: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
    letterSpacing: 0.2,
    paddingRight: 8,
    lineHeight: 20,
  },
  icon: {
    fontSize: 20,
    marginLeft: 4,
  },
  pointsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginTop: 4,
    letterSpacing: 0.5,
    paddingRight: 4,
  },
});

export default PointCard;
