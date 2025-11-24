import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Chip, Divider } from 'react-native-paper';

/**
 * Componente que muestra un resumen de las aplicaciones recientes
 * con su tiempo de uso, categoría y puntos ganados/perdidos
 */
const AppHistorySummary = ({ appHistory = [] }) => {
  if (!appHistory || appHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay aplicaciones recientes</Text>
      </View>
    );
  }

  // Función para verificar si es app del sistema
  const isSystemApp = (appName) => {
    if (!appName) return true;
    
    const appNameLower = appName.toLowerCase();
    
    const systemApps = [
      'launcher',
      'nexuslauncher',
      'pixellauncher',
      'onepluslauncher',
      'samsung',
      'system',
      'sistema',
      'settings',
      'configuración',
      'permissioncontroller',
      'packageinstaller',
      'package installer',
      'android system',
    ];
    
    for (const systemApp of systemApps) {
      if (appNameLower.includes(systemApp)) {
        return true;
      }
    }
    
    return false;
  };

  // Filtrar apps del sistema antes de procesar
  const filteredHistory = appHistory.filter(entry => !isSystemApp(entry.app));

  if (filteredHistory.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No hay aplicaciones recientes</Text>
      </View>
    );
  }

  // Agrupar apps por nombre y calcular totales
  const appSummary = {};
  filteredHistory.forEach((entry) => {
    const appName = entry.app;
    if (!appSummary[appName]) {
      appSummary[appName] = {
        app: appName,
        category: entry.category,
        totalTime: 0, // en segundos
        sessions: 0,
        points: 0,
        lastUsed: entry.timestamp,
      };
    }
    appSummary[appName].totalTime += entry.timeSpent || 0;
    appSummary[appName].sessions += 1;
    appSummary[appName].lastUsed = Math.max(appSummary[appName].lastUsed, entry.timestamp);
    
    // Calcular puntos según categoría
    const timeMinutes = (entry.timeSpent || 0) / 60;
    if (entry.category === 'positive') {
      appSummary[appName].points += Math.floor(timeMinutes / 5);
    } else if (entry.category === 'negative') {
      appSummary[appName].points -= Math.floor(timeMinutes / 5);
    }
  });

  // Convertir a array y ordenar por último uso (más reciente primero)
  const sortedApps = Object.values(appSummary)
    .sort((a, b) => b.lastUsed - a.lastUsed)
    .slice(0, 20); // Mostrar solo las 20 más recientes

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 
      ? `${hours}h ${remainingMinutes}min`
      : `${hours}h`;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return date.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'positive':
        return '#4CAF50';
      case 'negative':
        return '#f44336';
      default:
        return '#888888'; // Usar 6 dígitos para poder agregar alpha
    }
  };
  
  const getCategoryColorWithAlpha = (category, alpha = 0.12) => {
    const color = getCategoryColor(category);
    
    // Convertir hex a RGB
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Retornar en formato rgba() que React Native acepta
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getCategoryLabel = (category) => {
    switch (category) {
      case 'positive':
        return 'Positiva';
      case 'negative':
        return 'Negativa';
      default:
        return 'Neutra';
    }
  };

  const renderAppItem = ({ item }) => (
    <View style={styles.appItem}>
      <View style={styles.appHeader}>
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>
            {item.app}
          </Text>
          <View style={styles.appMeta}>
            <Chip
              style={[
                styles.categoryChip,
                { backgroundColor: getCategoryColorWithAlpha(item.category) }
              ]}
              textStyle={[
                styles.categoryChipText,
                { color: getCategoryColor(item.category) }
              ]}
              compact={false}
            >
              {getCategoryLabel(item.category)}
            </Chip>
            <Text style={styles.timeText}>
              {formatTime(item.totalTime)}
            </Text>
          </View>
        </View>
        <View style={styles.appStats}>
          <Text
            style={[
              styles.pointsText,
              item.points > 0 && styles.positivePoints,
              item.points < 0 && styles.negativePoints,
              item.points === 0 && styles.neutralPoints
            ]}
          >
            {item.points > 0 ? '+' : ''}{item.points}
          </Text>
          <Text style={styles.sessionsText}>
            {item.sessions} {item.sessions === 1 ? 'sesión' : 'sesiones'}
          </Text>
        </View>
      </View>
      <Text style={styles.lastUsedText}>
        Último uso: {formatDate(item.lastUsed)}
      </Text>
      <Divider style={styles.itemDivider} />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>
        Aplicaciones Recientes ({sortedApps.length})
      </Text>
      <Divider style={styles.titleDivider}/>
      <FlatList
        data={sortedApps}
        renderItem={renderAppItem}
        keyExtractor={(item, index) => `${item.app}-${index}`}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  appItem: {
    marginBottom: 12,
    paddingBottom: 12,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  appInfo: {
    flex: 1,
    marginRight: 12,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 6,
  },
  appMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    height: 28,
    marginRight: 8,
    minWidth: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 4,
    lineHeight: "11.5"
  },
  timeText: {
    fontSize: 12,
    color: '#aaa',
    fontWeight: '500',
  },
  appStats: {
    alignItems: 'flex-end',
  },
  pointsText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  positivePoints: {
    color: '#4CAF50',
  },
  negativePoints: {
    color: '#f44336',
  },
  neutralPoints: {
    color: '#888',
  },
  sessionsText: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  lastUsedText: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  itemDivider: {
    backgroundColor: '#333',
    marginTop: 6,
    height: 1,
  },
  titleDivider: {
    backgroundColor: '#333',
    marginTop: 4,
    marginBottom: 20,
    height: 1,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default AppHistorySummary;

