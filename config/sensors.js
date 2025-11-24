// Configuración de todos los sensores disponibles
// Para agregar un nuevo sensor, simplemente añade un objeto aquí

export const SENSORS_CONFIG = [
  {
    id: '1',
    name: 'Sensor de sesiones de aplicaciones móviles',
    type: 'app_sessions',
    icon: '📱',
    description: 'Monitorea tu uso responsable de aplicaciones móviles. Gana puntos por mantener un equilibrio saludable entre el tiempo de uso y momentos de desconexión.',
    category: 'social',
    color: '#4A90E2',
  },
  {
    id: '2',
    name: 'Sensor de horario de uso del celular',
    type: 'phone_usage',
    icon: '⏰',
    description: 'Rastrea tus patrones de uso del celular para promover hábitos saludables. Obtén puntos por respetar horarios de descanso y evitar el uso excesivo.',
    category: 'social',
    color: '#50C878',
  },
  {
    id: '3',
    name: 'Sensor de conteo de pasos diarios',
    type: 'step_count',
    icon: '👟',
    description: 'Fomenta la actividad física diaria. Gana puntos por cada paso que des, ayudándote a mantener un estilo de vida activo y saludable.',
    category: 'fisica',
    color: '#FF6B6B',
  },
  {
    id: '4',
    name: 'Sensor de contribuciones de Github',
    type: 'github_contributions',
    icon: '💻',
    description: 'Promueve el aprendizaje continuo y la productividad. Obtén puntos por tus contribuciones en proyectos de código, fomentando el crecimiento cognitivo y profesional.',
    category: 'cognitivo',
    color: '#9B59B6',
  },
];

// Configuración por defecto para cada sensor
export const getDefaultSensorState = (sensorConfig) => ({
  ...sensorConfig,
  isActive: false,
  lastPoints: 0,
  lastUpdate: 'Nunca',
  data: null,
});

// Inicializar todos los sensores con su estado por defecto
export const initializeSensors = () => {
  return SENSORS_CONFIG.map(config => getDefaultSensorState(config));
};
