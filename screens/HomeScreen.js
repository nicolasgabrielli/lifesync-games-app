import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Button, IconButton, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import PointCard from '../components/PointCard';

export default function HomeScreen({ userPoints }) {
  const { username, logout, refreshPoints } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const totalPoints = Object.values(userPoints || {}).reduce((sum, points) => sum + points, 0);

  // Calcular padding bottom para respetar el tabBar
  const contentPaddingBottom = 12;
  const androidNavPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 0)
    : 0;
  const baseHeight = 56;
  const tabBarHeight = baseHeight + contentPaddingBottom + androidNavPadding;
  const scrollPaddingBottom = tabBarHeight + 24;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshPoints();
    setIsRefreshing(false);
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: '#1a1a2e' }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <View style={{ height: 0 }} />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.userInfo}>
            <Text style={styles.usernameText}>{username || 'Usuario'}</Text>
          </View>
          <View style={styles.actions}>
            <IconButton
              icon="refresh"
              iconColor="#ff6b35"
              size={24}
              onPress={handleRefresh}
              disabled={isRefreshing}
            />
            <IconButton
              icon="logout"
              iconColor="#ff6b35"
              size={24}
              onPress={logout}
            />
          </View>
        </View>
        
        {isRefreshing && (
          <View style={styles.refreshingContainer}>
            <ActivityIndicator size="small" color="#ff6b35" />
            <Text style={styles.refreshingText}>Actualizando puntos...</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.welcomeText}>Bienvenido</Text>
          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Puntos Totales</Text>
            <Text style={styles.totalPoints}>{totalPoints.toLocaleString()}</Text>
            <Text style={styles.totalSubtext}>Mantén hábitos saludables para ganar más puntos</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Áreas de Bienestar</Text>
          <Text style={styles.sectionSubtitle}>Tu progreso en cada dimensión</Text>
        </View>

        <View style={styles.cardsContainer}>
          <PointCard
            category="Social"
            points={userPoints?.social || 0}
            color="#2d3561"
            icon="👥"
          />
          <PointCard
            category="Física"
            points={userPoints?.fisica || 0}
            color="#2d3561"
            icon="💪"
          />
          <PointCard
            category="Afectivo"
            points={userPoints?.afectivo || 0}
            color="#2d3561"
            icon="❤️"
          />
          <PointCard
            category="Cognitivo"
            points={userPoints?.cognitivo || 0}
            color="#2d3561"
            icon="🧠"
          />
          <PointCard
            category="Lingüístico"
            points={userPoints?.linguistico || 0}
            color="#2d3561"
            icon="📝"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
  },
  header: {
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
  totalContainer: {
    backgroundColor: '#2d3561',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 16,
    fontWeight: '500',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
  },
  totalPoints: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#ff6b35',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  totalSubtext: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 12,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  userInfo: {
    flex: 1,
  },
  usernameText: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  refreshingText: {
    color: '#aaa',
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 22,
    paddingRight: 8,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
