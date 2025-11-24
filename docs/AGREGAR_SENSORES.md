# 📖 Guía para Agregar Nuevos Sensores

Esta guía te ayudará a agregar nuevos sensores a la aplicación de manera fácil y rápida.

## 📁 Estructura de Archivos

```
LifeSync-Games App/
├── config/
│   └── sensors.js          # Configuración de sensores
├── components/
│   ├── SensorCard.js       # Tarjeta de sensor en la lista
│   ├── SensorDataDisplay.js # Visualización de datos del sensor
│   └── PointCard.js        # Tarjeta de puntos
├── hooks/
│   └── useSensor.js        # Lógica de sensores
└── screens/
    ├── SensorsScreen.js    # Pantalla de lista
    └── SensorDetailScreen.js # Pantalla de detalle
```

## 🚀 Cómo Agregar un Nuevo Sensor

### Paso 1: Agregar la Configuración en `config/sensors.js`

Agrega un nuevo objeto al array `SENSORS_CONFIG`:

```javascript
{
  id: '5',  // ID único (siguiente número disponible)
  name: 'Sensor de ejemplo',
  type: 'example_sensor',  // Tipo único (usar snake_case)
  icon: '🔔',  // Emoji o icono
  description: 'Descripción de qué hace el sensor',
  category: 'social',  // social, fisica, afectivo, cognitivo, linguistico
  color: '#FF5722',  // Color personalizado (opcional)
}
```

### Paso 2: Agregar la Lógica en `hooks/useSensor.js`

En la función `generateSensorData`, agrega un caso para tu nuevo tipo de sensor:

```javascript
case 'example_sensor':
  return {
    dato1: valor1,
    dato2: valor2,
    dato3: valor3,
  };
```

En la función `getInitialData`, agrega los valores iniciales:

```javascript
case 'example_sensor':
  return { dato1: 0, dato2: 0, dato3: 'Ninguno' };
```

En la función `updatePoints`, agrega cómo se calculan los puntos:

```javascript
case 'example_sensor':
  newPoints = Math.floor(Math.random() * 5) + 1;
  break;
```

### Paso 3: Agregar la Visualización en `components/SensorDataDisplay.js`

Agrega un caso en el switch para mostrar los datos:

```javascript
case 'example_sensor':
  return (
    <View style={styles.dataContainer}>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Dato 1:</Text>
        <Text style={styles.dataValue}>{sensorData.dato1}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Dato 2:</Text>
        <Text style={styles.dataValue}>{sensorData.dato2}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Dato 3:</Text>
        <Text style={styles.dataValue}>{sensorData.dato3}</Text>
      </View>
    </View>
  );
```

## ✅ Ejemplo Completo

Supongamos que quieres agregar un "Sensor de música escuchada":

### 1. En `config/sensors.js`:

```javascript
{
  id: '5',
  name: 'Sensor de música escuchada',
  type: 'music_listening',
  icon: '🎵',
  description: 'Monitorea las canciones que escuchas. Genera puntos por cada canción reproducida.',
  category: 'afectivo',
  color: '#E91E63',
}
```

### 2. En `hooks/useSensor.js`:

```javascript
// En generateSensorData:
case 'music_listening':
  return {
    songsToday: Math.floor(Math.random() * 20) + 10,
    minutesListened: Math.floor(Math.random() * 120) + 30,
    favoriteGenre: ['Pop', 'Rock', 'Jazz', 'Electrónica'][Math.floor(Math.random() * 4)],
  };

// En getInitialData:
case 'music_listening':
  return { songsToday: 0, minutesListened: 0, favoriteGenre: 'Ninguno' };

// En updatePoints:
case 'music_listening':
  newPoints = Math.floor(Math.random() * 2) + 1;
  break;
```

### 3. En `components/SensorDataDisplay.js`:

```javascript
case 'music_listening':
  return (
    <View style={styles.dataContainer}>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Canciones hoy:</Text>
        <Text style={styles.dataValue}>{sensorData.songsToday}</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Minutos escuchados:</Text>
        <Text style={styles.dataValue}>{sensorData.minutesListened} min</Text>
      </View>
      <View style={styles.dataRow}>
        <Text style={styles.dataLabel}>Género favorito:</Text>
        <Text style={styles.dataValue}>{sensorData.favoriteGenre}</Text>
      </View>
    </View>
  );
```

## 🎯 Listo!

Después de estos pasos, tu nuevo sensor aparecerá automáticamente en la lista de sensores y funcionará completamente. No necesitas modificar ningún otro archivo.

## 📝 Notas

- El `id` debe ser único
- El `type` debe ser único y en snake_case
- Los datos se actualizan cada 3 segundos cuando el sensor está activo
- Los puntos se calculan automáticamente según la lógica definida
- La categoría del sensor afecta a qué tipo de puntos se suman (esto puede implementarse en el futuro)

