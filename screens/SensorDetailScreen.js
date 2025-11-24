import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Platform, AppState, Linking } from 'react-native';
import { Text, Chip, Divider, Surface, Button, TextInput } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useSensor } from '../hooks/useSensor';
import SensorDataDisplay from '../components/SensorDataDisplay';
import AppHistorySummary from '../components/AppHistorySummary';
import { showPermissionInfo } from '../services/sensorPermissions';
import { showUsageStatsPermissionInfo, openUsageStatsSettings, openAccessibilitySettings, recheckPermissions } from '../services/appUsageDetection';
import { githubService } from '../services/githubService';

export default function SensorDetailScreen({ route, navigation }) {
  const { sensor } = route.params;
  
  // Verificar que el sensor tenga todos los datos necesarios
  if (!sensor || !sensor.id || !sensor.type) {
    console.error('[LifeSync] Sensor inválido recibido:', sensor);
    return null;
  }
  
  
  const { isActive, points, sensorData, toggleActive, hasPermission, isLoading, refreshSensor, reloadData } = useSensor(sensor);
  const insets = useSafeAreaInsets();
  const appState = useRef(AppState.currentState);
  const lastFocusTime = useRef(0);
  
  // Estado para configuración de GitHub
  const [githubToken, setGithubToken] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [githubConfigError, setGithubConfigError] = useState('');
  const [githubConfigSuccess, setGithubConfigSuccess] = useState('');
  const [isGithubConfigured, setIsGithubConfigured] = useState(false);

  // Cargar configuración de GitHub si es el sensor de GitHub
  useEffect(() => {
    if (sensor.type === 'github_contributions') {
      loadGithubConfig();
    }
  }, [sensor.type]);

  // Verificar si el sensor de GitHub puede activarse
  const canActivateGithubSensor = sensor.type !== 'github_contributions' || isGithubConfigured;

  const loadGithubConfig = async () => {
    try {
      const configured = await githubService.isConfigured();
      setIsGithubConfigured(configured);
      if (configured) {
        const username = await githubService.getUsername();
        setGithubUsername(username || '');
        // No mostrar el token por seguridad
        setGithubToken('••••••••••••••••');
      }
    } catch (error) {
      console.error('[SensorDetail] Error al cargar configuración de GitHub:', error);
    }
  };

  const handleGithubConfig = async () => {
    setIsConfiguring(true);
    setGithubConfigError('');
    setGithubConfigSuccess('');

    try {
      if (!githubToken || !githubUsername) {
        setGithubConfigError('Por favor completa todos los campos');
        setIsConfiguring(false);
        return;
      }

      // Si el token está oculto (••••), no actualizarlo
      if (githubToken === '••••••••••••••••') {
        // Solo actualizar username si cambió
        await githubService.setUsername(githubUsername);
        setIsGithubConfigured(true);
        setGithubConfigSuccess('Username actualizado correctamente');
        setIsConfiguring(false);
        return;
      }

      // Guardar token y username temporalmente para verificar
      await githubService.setToken(githubToken);
      await githubService.setUsername(githubUsername);

      // Verificar que las credenciales funcionen y tengan los permisos necesarios
      try {
        const permissions = await githubService.verifyTokenPermissions();
        
        if (!permissions.valid || !permissions.canReadEvents) {
          setGithubConfigError(
            permissions.message || 
            'El token no tiene los permisos necesarios. Asegúrate de seleccionar "public_repo" y "read:user" al crear el token.'
          );
          await githubService.clearCredentials();
          setIsGithubConfigured(false);
          setIsConfiguring(false);
          return;
        }

        // Verificar que el username coincida
        if (permissions.username && permissions.username.toLowerCase() !== githubUsername.toLowerCase()) {
          setGithubConfigError(
            `El username no coincide con el token. El token pertenece a: ${permissions.username}`
          );
          await githubService.clearCredentials();
          setIsGithubConfigured(false);
          setIsConfiguring(false);
          return;
        }

        setIsGithubConfigured(true);
        setGithubConfigSuccess(`Configuración guardada correctamente. Usuario: ${permissions.username}`);
        // Ocultar el token después de guardarlo
        setGithubToken('••••••••••••••••');
        
        // Recargar datos del sensor
        if (reloadData) {
          setTimeout(() => {
            reloadData();
          }, 500);
        }
      } catch (error) {
        setGithubConfigError('Token inválido o expirado. Verifica tus credenciales.');
        await githubService.clearCredentials();
        setIsGithubConfigured(false);
      }
    } catch (error) {
      setGithubConfigError('Error al guardar configuración: ' + error.message);
    } finally {
      setIsConfiguring(false);
    }
  };

  const handleClearGithubConfig = async () => {
    try {
      await githubService.clearCredentials();
      setIsGithubConfigured(false);
      setGithubToken('');
      setGithubUsername('');
      setGithubConfigSuccess('Configuración eliminada');
      setGithubConfigError('');
    } catch (error) {
      setGithubConfigError('Error al eliminar configuración: ' + error.message);
    }
  };

  // Recargar datos cuando la pantalla se enfoca (con debounce para evitar actualizaciones excesivas)
  useFocusEffect(
    React.useCallback(() => {
      const now = Date.now();
      // Solo recargar si han pasado al menos 1 segundo desde la última actualización
      if (now - lastFocusTime.current > 1000) {
        lastFocusTime.current = now;
        if (reloadData) {
          reloadData();
        }
      }
      // Recargar configuración de GitHub
      if (sensor.type === 'github_contributions') {
        loadGithubConfig();
      }
    }, [reloadData, sensor.type])
  );

  // Re-verificar permisos cuando la app vuelve al primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        (sensor.type === 'app_sessions' || sensor.type === 'phone_usage')
      ) {
        // Re-verificar permisos y refrescar el sensor
        recheckPermissions().then(() => {
          if (refreshSensor) {
            refreshSensor();
          }
          // También recargar datos cuando la app vuelve al primer plano (con debounce)
          const now = Date.now();
          if (now - lastFocusTime.current > 1000) {
            lastFocusTime.current = now;
            if (reloadData) {
              reloadData();
            }
          }
        });
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription?.remove();
    };
  }, [sensor.type, refreshSensor, reloadData]);
  
  // Función para re-verificar permisos manualmente
  const handleRecheckPermissions = async () => {
    await recheckPermissions();
    if (refreshSensor) {
      refreshSensor();
    }
  };

  // Calcular padding bottom para respetar el tabBar
  const contentPaddingBottom = 12;
  const androidNavPadding = Platform.OS === 'android' 
    ? Math.max(insets.bottom, 0)
    : 0;
  const baseHeight = 56;
  const paddingTop = 2;
  const tabBarHeight = baseHeight + paddingTop + contentPaddingBottom + androidNavPadding;
  const scrollPaddingBottom = tabBarHeight + 24;

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: '#1a1a2e' }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: scrollPaddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            {sensor.icon && <Text style={styles.headerIcon}>{sensor.icon}</Text>}
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>{sensor.name}</Text>
            </View>
          </View>
          <Button
            mode={isActive ? "contained" : "outlined"}
            onPress={toggleActive}
            loading={isLoading}
            disabled={isLoading || (!canActivateGithubSensor && !isActive)}
            style={[
              styles.toggleButton,
              isActive && { backgroundColor: '#4CAF50' },
              (!canActivateGithubSensor && !isActive) && { opacity: 0.5 }
            ]}
            labelStyle={styles.toggleButtonLabel}
            contentStyle={styles.toggleButtonContent}
          >
            {isLoading 
              ? 'Iniciando...' 
              : isActive 
                ? 'Desactivar Sensor' 
                : (!canActivateGithubSensor 
                    ? 'Configura GitHub primero' 
                    : 'Activar Sensor')}
          </Button>
          
          {sensor.type === 'github_contributions' && !isGithubConfigured && !isActive && (
            <Text style={styles.githubConfigWarning}>
              ⚠️ Debes configurar tu token y username de GitHub antes de activar este sensor
            </Text>
          )}
          {hasPermission === false && sensor.type !== 'app_sessions' && sensor.type !== 'phone_usage' && (
            <View style={styles.permissionErrorContainer}>
              <Text style={styles.permissionError}>
                No se pudo acceder al sensor. Verifica los permisos en la configuración.
              </Text>
              <View style={styles.permissionButtons}>
                <Button
                  mode="text"
                  onPress={() => showPermissionInfo(sensor.type)}
                  style={styles.infoButton}
                  labelStyle={styles.infoButtonLabel}
                >
                  Instrucciones completas
                </Button>
              </View>
            </View>
          )}
          
          {(sensor.type === 'app_sessions' || sensor.type === 'phone_usage') && (
            <>
              {hasPermission === false && (
                <View style={styles.permissionErrorContainer}>
                  <Text style={styles.permissionError}>
                    ❌ Permisos no otorgados{'\n\n'}
                    Este sensor requiere permisos para detectar aplicaciones en tiempo real. Sin permisos, el sensor no puede funcionar.
                  </Text>
                  <View style={styles.permissionButtons}>
                    <Button
                      mode="outlined"
                      onPress={() => showPermissionInfo(sensor.type)}
                      style={[styles.infoButton, { marginTop: 8, borderColor: '#ff6b35' }]}
                      labelStyle={[styles.infoButtonLabel, { color: '#ff6b35' }]}
                    >
                      Cómo otorgar permisos
                    </Button>
                    <Button
                      mode="contained"
                      onPress={openAccessibilitySettings}
                      style={[styles.infoButton, { marginTop: 8, backgroundColor: '#4CAF50' }]}
                      labelStyle={styles.infoButtonLabel}
                    >
                      Habilitar Accesibilidad
                    </Button>
                    <Button
                      mode="text"
                      onPress={openUsageStatsSettings}
                      style={styles.infoButton}
                      labelStyle={styles.infoButtonLabel}
                    >
                      Acceso a Datos de Uso
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={handleRecheckPermissions}
                      style={[styles.infoButton, { marginTop: 8, borderColor: '#2196F3' }]}
                      labelStyle={[styles.infoButtonLabel, { color: '#2196F3' }]}
                    >
                      Re-verificar Permisos
                    </Button>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <Surface style={styles.pointsCard} elevation={4}>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Puntos Ganados</Text>
            <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
            <Text style={styles.pointsSubtext}>
              {isActive 
                ? 'Ganando puntos activamente' 
                : 'Activa el sensor para comenzar a ganar puntos'}
            </Text>
          </View>
        </Surface>

        {isActive && sensorData && (
          <Surface style={styles.card} elevation={3}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Actividad Actual</Text>
              <Divider style={styles.divider} />
              <SensorDataDisplay sensorType={sensor.type} sensorData={sensorData} />
            </View>
          </Surface>
        )}

        {sensor.type === 'app_sessions' && sensorData && sensorData.appHistory && (
          <Surface style={styles.card} elevation={3}>
            <View style={styles.cardContent}>
              <AppHistorySummary appHistory={sensorData.appHistory} />
            </View>
          </Surface>
        )}

        {sensor.type === 'github_contributions' && (
          <Surface style={styles.card} elevation={3}>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>Configuración de GitHub</Text>
              <Divider style={styles.divider} />
              
              {isGithubConfigured && (
                <View style={styles.githubConfigStatus}>
                  <Chip
                    style={[styles.statusChip, { backgroundColor: '#4CAF50' }]}
                    textStyle={styles.chipText}
                  >
                    ✓ Configurado
                  </Chip>
                </View>
              )}

              <TextInput
                label="Token de GitHub (Personal Access Token)"
                value={githubToken}
                onChangeText={setGithubToken}
                mode="outlined"
                secureTextEntry={githubToken !== '••••••••••••••••'}
                style={styles.githubInput}
                textColor="#fff"
                outlineColor="#2d3561"
                activeOutlineColor="#ff6b35"
                disabled={isConfiguring || isGithubConfigured}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              />
              
              <View style={styles.githubPermissionsInfo}>
                <Text style={styles.githubPermissionsTitle}>Permisos requeridos del token:</Text>
                <View style={styles.githubPermissionItem}>
                  <Text style={styles.githubPermissionCheck}>✓</Text>
                  <Text style={styles.githubPermissionText}>
                    <Text style={styles.githubPermissionBold}>public_repo</Text> - Para leer repositorios públicos
                  </Text>
                </View>
                <View style={styles.githubPermissionItem}>
                  <Text style={styles.githubPermissionCheck}>✓</Text>
                  <Text style={styles.githubPermissionText}>
                    <Text style={styles.githubPermissionBold}>read:user</Text> - Para leer información del usuario
                  </Text>
                </View>
                <View style={styles.githubPermissionItem}>
                  <Text style={styles.githubPermissionOptional}>○</Text>
                  <Text style={styles.githubPermissionText}>
                    <Text style={styles.githubPermissionBold}>repo</Text> - Opcional: Para leer repositorios privados
                  </Text>
                </View>
              </View>
              
              <Text style={styles.githubHelpText}>
                Crea un token en: GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
              </Text>

              <TextInput
                label="Username de GitHub"
                value={githubUsername}
                onChangeText={setGithubUsername}
                mode="outlined"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.githubInput}
                textColor="#fff"
                outlineColor="#2d3561"
                activeOutlineColor="#ff6b35"
                disabled={isConfiguring}
                placeholder="tu-usuario"
              />

              {githubConfigError ? (
                <Text style={styles.githubError}>{githubConfigError}</Text>
              ) : null}

              {githubConfigSuccess ? (
                <Text style={styles.githubSuccess}>{githubConfigSuccess}</Text>
              ) : null}

              <View style={styles.githubButtons}>
                <Button
                  mode="contained"
                  onPress={handleGithubConfig}
                  loading={isConfiguring}
                  disabled={isConfiguring}
                  style={[styles.githubButton, { backgroundColor: '#4CAF50' }]}
                  labelStyle={styles.githubButtonLabel}
                >
                  {isGithubConfigured ? 'Actualizar Configuración' : 'Guardar Configuración'}
                </Button>
                
                {isGithubConfigured && (
                  <Button
                    mode="outlined"
                    onPress={handleClearGithubConfig}
                    disabled={isConfiguring}
                    style={[styles.githubButton, { borderColor: '#f44336', marginTop: 8 }]}
                    labelStyle={[styles.githubButtonLabel, { color: '#f44336' }]}
                  >
                    Eliminar Configuración
                  </Button>
                )}

                <Button
                  mode="text"
                  onPress={() => Linking.openURL('https://github.com/settings/tokens')}
                  style={styles.githubButton}
                  labelStyle={[styles.githubButtonLabel, { color: '#ff6b35' }]}
                >
                  Crear Token en GitHub →
                </Button>
              </View>
            </View>
          </Surface>
        )}

        <Surface style={styles.card} elevation={3}>
          <View style={styles.cardContent}>
            <Text style={styles.cardLabel}>Acerca de este Sensor</Text>
            <Divider style={styles.divider} />
            <Text style={styles.description}>{sensor.description}</Text>
            <View style={styles.infoSection}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Estado</Text>
                <Chip
                  style={[
                    styles.statusChip,
                    { backgroundColor: isActive ? '#4CAF50' : '#f44336' }
                  ]}
                  textStyle={styles.chipText}
                >
                  {isActive ? 'Activo' : 'Inactivo'}
                </Chip>
              </View>
            </View>
          </View>
        </Surface>
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
  },
  header: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingRight: 8,
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 14,
    marginTop: 2,
  },
  titleTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    lineHeight: 30,
    letterSpacing: 0.2,
    paddingRight: 4,
  },
  toggleButton: {
    borderRadius: 12,
    marginTop: 12,
  },
  toggleButtonContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  toggleButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    letterSpacing: 0.3,
    paddingHorizontal: 4,
  },
  pointsCard: {
    backgroundColor: '#2d3561',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#2d3561',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardContent: {
    padding: 24,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
    letterSpacing: 0.3,
    paddingRight: 4,
  },
  pointsValue: {
    fontSize: 44,
    fontWeight: 'bold',
    color: '#ff6b35',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.5,
    paddingHorizontal: 8,
  },
  pointsSubtext: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  divider: {
    backgroundColor: '#444',
    marginBottom: 20,
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: '#aaa',
    lineHeight: 24,
    marginBottom: 20,
    paddingRight: 4,
  },
  infoSection: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#aaa',
    fontWeight: '500',
    paddingRight: 12,
    paddingVertical: 2,
  },
  statusChip: {
    height: 28,
    marginLeft: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 4,
    lineHeight: "normal"
  },
  permissionErrorContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  permissionError: {
    color: '#ff4444',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  infoButton: {
    marginTop: 4,
  },
  infoButtonLabel: {
    fontSize: 12,
    color: '#4CAF50',
  },
  permissionButtons: {
    marginTop: 8,
    alignItems: 'center',
  },
  githubConfigStatus: {
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  githubInput: {
    marginBottom: 8,
    backgroundColor: '#1a1a2e',
  },
  githubHelpText: {
    fontSize: 11,
    color: '#888',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  githubPermissionsInfo: {
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2d3561',
  },
  githubPermissionsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  githubPermissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  githubPermissionCheck: {
    fontSize: 14,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: 'bold',
  },
  githubPermissionOptional: {
    fontSize: 14,
    color: '#888',
    marginRight: 8,
    fontWeight: 'bold',
  },
  githubPermissionText: {
    fontSize: 11,
    color: '#aaa',
    flex: 1,
    lineHeight: 16,
  },
  githubPermissionBold: {
    fontWeight: '600',
    color: '#ff6b35',
  },
  githubError: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 8,
    marginBottom: 8,
  },
  githubSuccess: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 8,
  },
  githubButtons: {
    marginTop: 8,
  },
  githubButton: {
    marginTop: 4,
  },
  githubButtonLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  githubConfigWarning: {
    fontSize: 12,
    color: '#ffa366',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
});
