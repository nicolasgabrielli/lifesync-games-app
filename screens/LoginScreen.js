import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { login } = useAuth();

  const validateUsername = (text) => {
    const trimmed = text.trim();
    if (!trimmed) {
      setUsernameError('El usuario es requerido');
      return false;
    }
    if (trimmed.length < 3) {
      setUsernameError('El usuario debe tener al menos 3 caracteres');
      return false;
    }
    if (trimmed.length > 50) {
      setUsernameError('El usuario no puede tener más de 50 caracteres');
      return false;
    }
    setUsernameError('');
    return true;
  };

  const validatePassword = (text) => {
    if (!text) {
      setPasswordError('La contraseña es requerida');
      return false;
    }
    if (text.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    // Limpiar mensajes previos
    setError('');
    setSuccess('');
    
    // Validar campos
    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);
    
    if (!isUsernameValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('Verificando credenciales...');

    try {
      const result = await login(username.trim(), password);
      
      if (result.success) {
        setSuccess('¡Login exitoso! Redirigiendo...');
        // El contexto manejará el cambio de estado y redirigirá automáticamente
      } else {
        setSuccess('');
        setError(result.error || 'Error al iniciar sesión. Verifica tus credenciales.');
      }
    } catch (err) {
      setSuccess('');
      setError('Error de conexión. Verifica tu internet e intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.title}>LifeSync Games</Text>
              <Text style={styles.subtitle}>
                Inicia sesión para ver tus puntos
              </Text>
            </View>

            <Surface style={styles.loginCard} elevation={4}>
              <View style={styles.form}>
                <TextInput
                  label="Usuario"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError('');
                    setSuccess('');
                    if (usernameError) {
                      validateUsername(text);
                    }
                  }}
                  onBlur={() => validateUsername(username)}
                  mode="outlined"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  textColor="#fff"
                  outlineColor={usernameError ? '#ff4444' : '#2d3561'}
                  activeOutlineColor={usernameError ? '#ff4444' : '#ff6b35'}
                  error={!!usernameError}
                  disabled={isSubmitting}
                />
                {usernameError ? (
                  <Text style={styles.fieldError}>{usernameError}</Text>
                ) : null}

                <TextInput
                  label="Contraseña"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError('');
                    setSuccess('');
                    if (passwordError) {
                      validatePassword(text);
                    }
                  }}
                  onBlur={() => validatePassword(password)}
                  mode="outlined"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  textColor="#fff"
                  outlineColor={passwordError ? '#ff4444' : '#2d3561'}
                  activeOutlineColor={passwordError ? '#ff4444' : '#ff6b35'}
                  error={!!passwordError}
                  disabled={isSubmitting}
                  onSubmitEditing={handleLogin}
                />
                {passwordError ? (
                  <Text style={styles.fieldError}>{passwordError}</Text>
                ) : null}

                {success ? (
                  <View style={styles.successContainer}>
                    <Text style={styles.successText}>{success}</Text>
                  </View>
                ) : null}

                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleLogin}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                  style={styles.loginButton}
                  contentStyle={styles.loginButtonContent}
                  labelStyle={styles.loginButtonLabel}
                >
                  {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>
              </View>
            </Surface>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Los puntos que recopiles aquí se pueden usar en Valheim
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#ff6b35',
    marginBottom: 12,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 22,
  },
  loginCard: {
    backgroundColor: '#2d3561',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#1a1a2e',
  },
  fieldError: {
    color: '#ff4444',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -8,
    paddingHorizontal: 4,
  },
  successContainer: {
    marginBottom: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#4caf50',
    borderRadius: 8,
  },
  successText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  errorContainer: {
    marginBottom: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#ff6b35',
    borderRadius: 12,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});

