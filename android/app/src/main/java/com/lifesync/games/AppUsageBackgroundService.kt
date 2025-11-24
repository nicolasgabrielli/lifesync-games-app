package com.lifesync.games

import android.app.*
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Build
import android.os.IBinder
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ReactContext
import org.json.JSONArray
import org.json.JSONObject

class AppUsageBackgroundService : Service() {
    companion object {
        private const val TAG = "AppUsageBackgroundService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "lifesync_app_usage"
        private const val PREFS_NAME = "LifeSyncAppUsage"
        private const val KEY_CURRENT_APP = "currentApp"
        private const val KEY_LAST_UPDATE = "lastUpdate"
        
        private var reactContext: ReactContext? = null
        private var isRunning = false
        
        fun setReactContext(context: ReactContext) {
            reactContext = context
            Log.d(TAG, "ReactContext configurado en servicio de background")
        }
    }
    
    private val handler = Handler(Looper.getMainLooper())
    private var pollingRunnable: Runnable? = null
    private var lastDetectedApp: String? = null
    private lateinit var prefs: SharedPreferences
    
    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        lastDetectedApp = prefs.getString(KEY_CURRENT_APP, null)
        createNotificationChannel()
        Log.d(TAG, "Servicio de background creado")
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Servicio iniciado")
        startForeground(NOTIFICATION_ID, createNotification())
        startPolling()
        isRunning = true
        
        // Programar reinicio automático si el servicio se detiene
        scheduleRestartIfNeeded()
        
        return START_STICKY // Reiniciar si el sistema lo mata
    }
    
    private fun scheduleRestartIfNeeded() {
        // Verificar si el sensor está activo
        val prefs = getSharedPreferences("LifeSyncSensors", Context.MODE_PRIVATE)
        val activeSensors = prefs.getStringSet("activeSensors", emptySet())
        
        if (activeSensors?.contains("1") == true) {
            // Programar un reinicio del servicio en caso de que se detenga
            handler.postDelayed({
                if (!isRunning) {
                    Log.d(TAG, "Servicio detenido pero sensor activo, reiniciando...")
                    val restartIntent = Intent(this, AppUsageBackgroundService::class.java)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        startForegroundService(restartIntent)
                    } else {
                        startService(restartIntent)
                    }
                }
            }, 30000) // Verificar cada 30 segundos
        }
    }
    
    override fun onBind(intent: Intent?): IBinder? = null
    
    override fun onDestroy() {
        super.onDestroy()
        stopPolling()
        isRunning = false
        Log.d(TAG, "Servicio destruido")
        
        // Intentar reiniciar si el sensor sigue activo
        val prefs = getSharedPreferences("LifeSyncSensors", Context.MODE_PRIVATE)
        val activeSensors = prefs.getStringSet("activeSensors", emptySet())
        if (activeSensors?.contains("1") == true) {
            Log.d(TAG, "Sensor aún activo, programando reinicio del servicio")
            handler.postDelayed({
                try {
                    val restartIntent = Intent(this, AppUsageBackgroundService::class.java)
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        startForegroundService(restartIntent)
                    } else {
                        startService(restartIntent)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error al reiniciar servicio", e)
                }
            }, 2000) // Reiniciar después de 2 segundos
        }
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Detección de Apps",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Monitorea las aplicaciones en uso"
                setShowBadge(false)
            }
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    private fun createNotification(): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("LifeSync Games")
            .setContentText("Monitoreando uso de aplicaciones")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(Notification.PRIORITY_LOW)
            .build()
    }
    
    private fun startPolling() {
        Log.d(TAG, "Iniciando polling de apps cada 5 segundos")
        
        pollingRunnable = object : Runnable {
            override fun run() {
                try {
                    detectCurrentApp()
                } catch (e: Exception) {
                    Log.e(TAG, "Error en polling", e)
                }
                
                // Programar siguiente verificación en 5 segundos
                handler.postDelayed(this, 5000)
            }
        }
        
        handler.post(pollingRunnable!!)
    }
    
    private fun stopPolling() {
        pollingRunnable?.let {
            handler.removeCallbacks(it)
            pollingRunnable = null
        }
        Log.d(TAG, "Polling detenido")
    }
    
    private fun detectCurrentApp() {
        try {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
            val time = System.currentTimeMillis()
            val stats = usageStatsManager.queryUsageStats(
                android.app.usage.UsageStatsManager.INTERVAL_BEST,
                time - 10000, // Últimos 10 segundos
                time
            )
            
            if (stats != null && stats.isNotEmpty()) {
                // Obtener la app más reciente
                val mostRecent = stats.maxByOrNull { it.lastTimeUsed }
                
                if (mostRecent != null) {
                    val packageName = mostRecent.packageName
                    val lastTimeUsed = mostRecent.lastTimeUsed
                    
                    // Solo considerar si se usó en los últimos 5 segundos
                    if (time - lastTimeUsed < 5000 && packageName != lastDetectedApp) {
                        Log.d(TAG, "🔄 App detectada: $lastDetectedApp → $packageName")
                        
                        // Guardar cambio
                        saveAppChange(packageName, time)
                        lastDetectedApp = packageName
                        
                        // Enviar evento a React Native
                        sendAppChangeEvent(packageName, time)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error detectando app actual", e)
        }
    }
    
    private fun saveAppChange(packageName: String, timestamp: Long) {
        try {
            val editor = prefs.edit()
            editor.putString(KEY_CURRENT_APP, packageName)
            editor.putLong(KEY_LAST_UPDATE, timestamp)
            
            // Guardar en historial
            val historyJson = prefs.getString("appHistory", "[]")
            try {
                val history = JSONArray(historyJson)
                val entry = JSONObject()
                entry.put("packageName", packageName)
                entry.put("timestamp", timestamp)
                history.put(entry)
                
                // Mantener solo las últimas 100 entradas
                if (history.length() > 100) {
                    val newHistory = JSONArray()
                    for (i in history.length() - 100 until history.length()) {
                        newHistory.put(history.get(i))
                    }
                    editor.putString("appHistory", newHistory.toString())
                } else {
                    editor.putString("appHistory", history.toString())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error actualizando historial", e)
            }
            
            editor.apply()
            Log.d(TAG, "💾 Cambio guardado: $packageName")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando cambio", e)
        }
    }
    
    private fun sendAppChangeEvent(packageName: String, timestamp: Long) {
        reactContext?.let { context ->
            try {
                if (context.hasActiveCatalystInstance()) {
                    val params = Arguments.createMap()
                    params.putString("packageName", packageName)
                    params.putLong("timestamp", timestamp)
                    
                    val eventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    eventEmitter.emit("onAppChanged", params)
                    Log.d(TAG, "✅ Evento enviado a React Native: $packageName")
                } else {
                    Log.w(TAG, "⚠️ CatalystInstance no activo, evento guardado")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error enviando evento", e)
            }
        } ?: run {
            Log.w(TAG, "⚠️ ReactContext no disponible, evento guardado")
        }
    }
}

