import React, { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { saveSensorPoints, saveSensorData, getSensorPointsById, getSensorData } from '../services/sensorStorage';
import { requestSensorPermissions, checkSensorAvailability } from '../services/sensorPermissions';
import { sensorManager } from '../services/sensorManager';
import { githubService } from '../services/githubService';

// Hook personalizado para manejar la lógica de cada sensor
export const useSensor = (sensor) => {
  // Inicializar estado desde sensorManager si está disponible, sino usar el valor del sensor
  const getInitialActiveState = () => {
    const isActiveInManager = sensorManager.isSensorActive(sensor.id);
    return isActiveInManager || sensor.isActive || false;
  };
  
  const [isActive, setIsActive] = useState(getInitialActiveState);
  const [points, setPoints] = useState(sensor.lastPoints || 0);
  const [sensorData, setSensorData] = useState(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const pointsRef = useRef(sensor.lastPoints || 0);
  const sensorIdRef = useRef(sensor.id);
  const categoryRef = useRef(sensor.category);
  const isRegisteredRef = useRef(false);
  const isInitialSyncRef = useRef(false);
  const isManualToggleRef = useRef(false); // Para evitar que la sincronización revierta cambios manuales

  // Actualizar refs cuando cambia el sensor
  useEffect(() => {
    sensorIdRef.current = sensor.id;
    categoryRef.current = sensor.category;
  }, [sensor.id, sensor.category]);

  // Función para sincronizar estado desde sensorManager
  const syncStateFromManager = React.useCallback(() => {
    // No sincronizar si hay un toggle manual en progreso
    if (isManualToggleRef.current) {
      return;
    }
    
    const isActiveInManager = sensorManager.isSensorActive(sensor.id);
    setIsActive(prevActive => {
      if (isActiveInManager !== prevActive) {
        // Si el estado cambia, marcar que la sincronización inicial ya se completó
        // para que el useEffect de activación no interfiera
        if (!isInitialSyncRef.current) {
          isInitialSyncRef.current = true;
        }
        return isActiveInManager;
      }
      return prevActive;
    });
  }, [sensor.id]);
  
  // Exponer función de sincronización que también puede ser llamada externamente
  const syncState = React.useCallback(() => {
    syncStateFromManager();
  }, [syncStateFromManager]);

  // Registrar el sensor en el servicio global al montar
  useEffect(() => {
    if (!isRegisteredRef.current) {
      sensorManager.registerSensor(
        sensor.id,
        sensor.type,
        sensor.category,
        handleDataUpdate,
        handlePointsUpdate
      );
      isRegisteredRef.current = true;
    } else {
      // Actualizar callbacks si ya está registrado
      sensorManager.updateCallbacks(sensor.id, handleDataUpdate, handlePointsUpdate);
    }

    // Sincronizar estado desde el servicio global
    syncStateFromManager();
    // Marcar que la sincronización inicial se completó después de un pequeño delay
    // para evitar que el useEffect de activación se ejecute antes
    const timer = setTimeout(() => {
      isInitialSyncRef.current = true;
    }, 50);

    return () => {
      clearTimeout(timer);
      // NO desregistrar el sensor al desmontar - mantenerlo en el servicio global
      // Solo actualizar callbacks para que no se pierdan las actualizaciones
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensor.id, sensor.type, sensor.category]);

  // Cargar puntos guardados al montar
  useEffect(() => {
    loadSavedData();
  }, [sensor.id]);

  // Actualizar pointsRef cuando cambia points
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // Manejar sincronización de estado desde el manager (solo para sincronización, no para activación manual)
  useEffect(() => {
    // No ejecutar si hay un toggle manual en progreso
    if (isManualToggleRef.current) {
      return;
    }

    // No ejecutar hasta que la sincronización inicial se complete
    if (!isInitialSyncRef.current) {
      return;
    }

    const isActiveInManager = sensorManager.isSensorActive(sensor.id);
    
    // Solo sincronizar si el estado del manager difiere del estado local
    // PERO no si el usuario acaba de hacer toggle (ese caso se maneja en toggleActive)
    // Esto es solo para casos donde el estado cambió externamente
    if (!isActive && isActiveInManager) {
      // El estado local dice inactivo pero el manager dice activo
      // Sincronizar el estado local con el manager (solo lectura, no detener)
      // Esto evita que se detenga un sensor que ya está activo cuando se monta el componente
      setIsActive(true);
    }
    // NO hacer nada si isActive es true pero el manager dice false
    // Esto evita que se revierta un toggle manual en progreso
    // NO detener el sensor al desmontar - el servicio global lo mantiene activo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Sincronizar estado cuando la app vuelve al primer plano
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active') {
        // Verificar si el sensor está activo en el servicio global
        const isActiveInManager = sensorManager.isSensorActive(sensor.id);
        if (isActiveInManager && !isActive) {
          setIsActive(true);
          // Recargar datos
          await loadSavedData();
        } else if (isActive) {
          // Recargar datos para actualizar la UI
          await loadSavedData();
        }
      }
    });

    return () => {
      subscription?.remove();
    };
  }, [isActive, sensor.id]);

  const loadSavedData = async () => {
    try {
      const savedPoints = await getSensorPointsById(sensor.id);
      if (savedPoints !== undefined && savedPoints !== null) {
        setPoints(Math.max(0, savedPoints)); // No permitir puntos negativos en el total
        pointsRef.current = Math.max(0, savedPoints);
      }
      const savedData = await getSensorData(sensor.id);
      if (savedData) {
        setSensorData(savedData);
        // Restaurar estado del sensor si está activo en el servicio global
        const sensorInstance = sensorManager.getSensor(sensor.id);
        if (sensorInstance) {
          if (sensor.type === 'step_count' && savedData.steps && typeof sensorInstance.setStepCount === 'function') {
            sensorInstance.setStepCount(savedData.steps);
          }
        }
      } else {
        // Inicializar datos si no hay guardados
        const initialData = getInitialData(sensor.type);
        setSensorData(initialData);
      }
    } catch (error) {
      console.error('[LifeSync] Error al cargar datos guardados:', error);
      const initialData = getInitialData(sensor.type);
      setSensorData(initialData);
    }
  };

  const handleDataUpdate = (data) => {
    setSensorData(data);
    // Guardar datos
    saveSensorData(sensorIdRef.current, data);
  };

  const handlePointsUpdate = (pointsToAdd) => {
    // Permitir puntos negativos para descuentos (apps negativas)
    const currentPoints = pointsRef.current;
    const totalPoints = Math.max(0, currentPoints + pointsToAdd); // No permitir puntos negativos totales
    const actualChange = totalPoints - currentPoints;
    
    if (actualChange !== 0) {
      setPoints(totalPoints);
      pointsRef.current = totalPoints;
      // Guardar puntos
      saveSensorPoints(sensorIdRef.current, totalPoints, categoryRef.current);
    }
  };

  const startSensor = async () => {
    setIsLoading(true);
    console.log(`[LifeSync] Iniciando sensor: ${sensor.type} (ID: ${sensor.id})`);
    
    // No cambiar isActive aquí - toggleActive ya lo estableció
    // Solo revertirlo si hay un error
    
    try {
      // Verificar permisos especiales para GitHub
      if (sensor.type === 'github_contributions') {
        const isConfigured = await githubService.isConfigured();
        if (!isConfigured) {
          setHasPermission(false);
          setIsLoading(false);
          setIsActive(false);
          alert('Por favor configura tu token y username de GitHub antes de activar el sensor.');
          return false;
        }
        
        // Verificar que el token tenga los permisos necesarios
        try {
          const permissions = await githubService.verifyTokenPermissions();
          if (!permissions.valid || !permissions.canReadEvents) {
            setHasPermission(false);
            setIsLoading(false);
            setIsActive(false);
            alert(`El token de GitHub no tiene los permisos necesarios. ${permissions.message || 'Asegúrate de seleccionar "public_repo" y "read:user" al crear el token.'}`);
            return false;
          }
          setHasPermission(true);
        } catch (error) {
          setHasPermission(false);
          setIsLoading(false);
          setIsActive(false);
          alert(`Error al verificar permisos de GitHub: ${error.message}`);
          return false;
        }
      } else {
        // Verificar permisos para otros sensores
        const permissionResult = await requestSensorPermissions(sensor.type);
        if (!permissionResult.granted) {
          setHasPermission(false);
          setIsLoading(false);
          console.log(`[LifeSync] Permiso denegado para ${sensor.type}:`, permissionResult.error);
          alert(`Permiso denegado: ${permissionResult.error || 'No se pudo acceder al sensor'}`);
          setIsActive(false);
          return false;
        }
        setHasPermission(true);
      }
      
      console.log(`[LifeSync] Permiso concedido para ${sensor.type}`);
      
      // Asegurar que el sensor esté registrado
      if (!isRegisteredRef.current) {
        sensorManager.registerSensor(
          sensor.id,
          sensor.type,
          sensor.category,
          handleDataUpdate,
          handlePointsUpdate
        );
        isRegisteredRef.current = true;
      } else {
        // Actualizar callbacks
        sensorManager.updateCallbacks(sensor.id, handleDataUpdate, handlePointsUpdate);
      }
      
      // Iniciar el sensor usando el servicio global
      const success = await sensorManager.startSensor(sensor.id, sensor.type, sensor.category, sensorData);
      
      if (success) {
        setIsLoading(false);
        console.log(`[LifeSync] Sensor ${sensor.type} iniciado correctamente`);
        // Asegurar que isActive esté en true después de iniciar exitosamente
        setIsActive(true);
        return true;
      } else {
        throw new Error('No se pudo iniciar el sensor');
      }
    } catch (error) {
      console.error('[LifeSync] Error al iniciar sensor:', error);
      alert('Error al iniciar el sensor: ' + error.message);
      setIsActive(false);
      setIsLoading(false);
      return false;
    }
  };

  const stopSensor = async () => {
    console.log(`[LifeSync] Deteniendo sensor ${sensor.id}...`);
    try {
      // Detener el sensor usando el servicio global
      await sensorManager.stopSensor(sensor.id);
      
      // Guardar estado final
      const currentPoints = pointsRef.current;
      await saveSensorPoints(sensorIdRef.current, currentPoints, categoryRef.current);
      if (sensorData) {
        await saveSensorData(sensorIdRef.current, sensorData);
      }
    } catch (error) {
      console.error('[LifeSync] Error al detener sensor:', error);
    }
    setIsLoading(false);
  };

  const toggleActive = async () => {
    console.log(`[LifeSync] Toggle sensor ${sensor.id}: ${isActive ? 'desactivar' : 'activar'}`);
    
    // Marcar que hay un toggle manual en progreso para evitar que la sincronización interfiera
    isManualToggleRef.current = true;
    
    try {
      if (!isActive) {
        // Si se va a activar, marcar la sincronización inicial como completada inmediatamente
        if (!isInitialSyncRef.current) {
          isInitialSyncRef.current = true;
        }
        
        // Establecer estado activo PRIMERO para feedback inmediato al usuario
        setIsActive(true);
        
        // Llamar a startSensor - si falla, revertirá el estado
        const success = await startSensor();
        
        // Si startSensor falló, ya estableció isActive a false
        // Si tuvo éxito, mantener isActive en true (ya está establecido)
        if (!success) {
          // startSensor ya estableció isActive a false, no necesitamos hacer nada más
          return;
        }
      } else {
        // Desactivar
        setIsActive(false);
        // Guardar estado final
        const currentPoints = pointsRef.current;
        if (currentPoints > 0) {
          console.log(`[LifeSync] Guardando puntos finales: ${currentPoints}`);
          await saveSensorPoints(sensorIdRef.current, currentPoints, categoryRef.current);
        }
        // Detener el sensor
        await stopSensor();
      }
    } finally {
      // Permitir sincronización después de un pequeño delay para que el estado se estabilice
      setTimeout(() => {
        isManualToggleRef.current = false;
      }, 1000);
    }
  };

  // Función para refrescar el sensor (útil después de otorgar permisos)
  const refreshSensor = async () => {
    console.log(`[LifeSync] Refrescando sensor ${sensor.id}...`);
    const sensorInstance = sensorManager.getSensor(sensor.id);
    if (isActive && sensorInstance) {
      // NO detener el sensor, solo re-verificar permisos y actualizar
      // El sensor ya está funcionando, solo necesitamos actualizar el estado de detección
      console.log(`[LifeSync] Sensor ${sensor.id} ya está activo, re-verificando permisos...`);
      // El sensor continuará funcionando, solo se actualizará el estado interno
      // No necesitamos reiniciarlo completamente
    } else if (isActive) {
      // Si está activo pero no hay instancia, reiniciar
      console.log(`[LifeSync] Sensor ${sensor.id} activo pero sin instancia, reiniciando...`);
      setIsActive(false);
      setTimeout(() => {
        setIsActive(true);
      }, 500);
    }
  };

  // Función para recargar datos guardados (útil cuando la pantalla se enfoca)
  const reloadData = async () => {
    await loadSavedData();
    // También sincronizar estado
    syncStateFromManager();
  };

  return {
    isActive,
    points,
    sensorData,
    toggleActive,
    hasPermission,
    isLoading,
    refreshSensor,
    reloadData,
    syncState,
  };
};

// Generar datos iniciales según el tipo de sensor
const getInitialData = (type) => {
  switch (type) {
    case 'app_sessions':
      return { 
        activeApps: 0, 
        totalTime: 0, 
        lastApp: 'Ninguna',
        lastAppCategory: 'Ninguna',
        positiveTime: 0,
        negativeTime: 0,
        neutralTime: 0,
        totalPoints: 0
      };
    case 'phone_usage':
      return { 
        totalUsage: 0, 
        healthyUsage: 0,
        unhealthyUsage: 0,
        pickups: 0, 
        avgSession: 0,
        currentTime: '--:--',
        isHealthyHour: true,
        totalPoints: 0
      };
    case 'step_count':
      return { steps: 0, distance: '0.00', calories: 0 };
    case 'github_contributions':
      return { commits: 0, repos: 0, lastCommit: 'Nunca' };
    default:
      return null;
  }
};
