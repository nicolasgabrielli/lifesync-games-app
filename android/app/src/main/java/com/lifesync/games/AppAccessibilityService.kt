package com.lifesync.games

import android.accessibilityservice.AccessibilityService
import android.view.accessibility.AccessibilityEvent
import android.util.Log
import android.content.Context
import android.content.SharedPreferences
import android.view.accessibility.AccessibilityEvent.*
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactApplication
import org.json.JSONArray
import org.json.JSONObject

class AppAccessibilityService : AccessibilityService() {
    companion object {
        private const val TAG = "AppAccessibilityService"
        private const val PREFS_NAME = "LifeSyncAppUsage"
        private const val KEY_CURRENT_APP = "currentApp"
        private const val KEY_APP_HISTORY = "appHistory"
        private const val KEY_LAST_UPDATE = "lastUpdate"
        
        private var reactContext: ReactContext? = null
        private var currentAppPackage: String? = null
        
        fun setReactContext(context: ReactContext) {
            reactContext = context
            Log.d(TAG, "ReactContext configurado en servicio de accesibilidad")
        }
        
        fun getCurrentApp(): String? {
            // Intentar obtener desde SharedPreferences si no está en memoria
            if (currentAppPackage == null && reactContext != null) {
                val prefs = reactContext!!.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                currentAppPackage = prefs.getString(KEY_CURRENT_APP, null)
                Log.d(TAG, "App actual cargada desde SharedPreferences: $currentAppPackage")
            }
            return currentAppPackage
        }
    }
    
    private lateinit var prefs: SharedPreferences
    
    override fun onCreate() {
        super.onCreate()
        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        // Cargar última app conocida
        currentAppPackage = prefs.getString(KEY_CURRENT_APP, null)
        Log.d(TAG, "Service created, last app: $currentAppPackage")
    }
    
    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        // Log TODOS los eventos para diagnóstico - esto nos dirá si el servicio está recibiendo eventos
        val eventTypeName = when (event.eventType) {
            AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> "TYPE_WINDOW_STATE_CHANGED"
            AccessibilityEvent.TYPE_VIEW_CLICKED -> "TYPE_VIEW_CLICKED"
            AccessibilityEvent.TYPE_VIEW_FOCUSED -> "TYPE_VIEW_FOCUSED"
            AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED -> "TYPE_WINDOW_CONTENT_CHANGED"
            else -> "OTRO (${event.eventType})"
        }
        Log.d(TAG, "📥 EVENTO RECIBIDO - Tipo: $eventTypeName, Package: ${event.packageName}, Class: ${event.className}")
        
        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val packageName = event.packageName?.toString()
            
            if (packageName != null && packageName != currentAppPackage) {
                val previousApp = currentAppPackage
                currentAppPackage = packageName
                val timestamp = System.currentTimeMillis()
                
                Log.d(TAG, "🔄 App changed: $previousApp → $packageName at $timestamp")
                
                // Guardar en SharedPreferences para persistencia
                saveAppChange(packageName, timestamp)
                
                // Enviar evento a React Native usando RCTDeviceEventEmitter
                // Intentar múltiples métodos para asegurar que el evento llegue
                var eventSent = false
                
                // Método 1: Usar ReactContext si está disponible
                reactContext?.let { context ->
                    try {
                        // Verificar que el contexto tenga un CatalystInstance activo
                        if (context.hasActiveCatalystInstance()) {
                            val params = Arguments.createMap()
                            params.putString("packageName", packageName)
                            params.putLong("timestamp", timestamp)
                            
                            val eventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            eventEmitter.emit("onAppChanged", params)
                            eventSent = true
                            Log.d(TAG, "✅ Evento enviado a React Native (método 1): $packageName")
                        } else {
                            Log.w(TAG, "⚠️ ReactContext no tiene CatalystInstance activo")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Error al enviar evento a React Native (método 1)", e)
                        e.printStackTrace()
                    }
                } ?: run {
                    Log.w(TAG, "⚠️ ReactContext es null")
                }
                
                // Método 2: Intentar obtener el contexto desde la aplicación
                if (!eventSent) {
                    try {
                        val application = applicationContext
                        if (application is com.facebook.react.ReactApplication) {
                            val reactNativeHost = application.reactNativeHost
                            val reactInstanceManager = reactNativeHost.reactInstanceManager
                            val currentReactContext = reactInstanceManager.currentReactContext
                            
                            currentReactContext?.let { context ->
                                if (context.hasActiveCatalystInstance()) {
                                    val params = Arguments.createMap()
                                    params.putString("packageName", packageName)
                                    params.putLong("timestamp", timestamp)
                                    
                                    val eventEmitter = context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                                    eventEmitter.emit("onAppChanged", params)
                                    eventSent = true
                                    Log.d(TAG, "✅ Evento enviado a React Native (método 2): $packageName")
                                    
                                    // Actualizar el reactContext estático para futuros eventos
                                    reactContext = context
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "❌ Error al enviar evento a React Native (método 2)", e)
                    }
                }
                
                if (!eventSent) {
                    Log.w(TAG, "⚠️ No se pudo enviar evento en tiempo real, pero se guardó para procesamiento posterior")
                }
            } else {
                if (packageName == null) {
                    Log.w(TAG, "⚠️ PackageName es null en el evento")
                } else if (packageName == currentAppPackage) {
                    Log.d(TAG, "ℹ️ App sigue siendo la misma: $packageName")
                }
            }
        } else {
            Log.d(TAG, "Evento ignorado - Tipo: ${event.eventType} (esperado: ${AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED})")
        }
    }
    
    /**
     * Guarda el cambio de app en SharedPreferences para persistencia
     */
    private fun saveAppChange(packageName: String, timestamp: Long) {
        try {
            val editor = prefs.edit()
            editor.putString(KEY_CURRENT_APP, packageName)
            editor.putLong(KEY_LAST_UPDATE, timestamp)
            
            // Guardar en historial (últimas 100 apps)
            val historyJson = prefs.getString(KEY_APP_HISTORY, "[]")
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
                    editor.putString(KEY_APP_HISTORY, newHistory.toString())
                } else {
                    editor.putString(KEY_APP_HISTORY, history.toString())
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error actualizando historial de apps", e)
            }
            
            editor.apply()
            Log.d(TAG, "💾 Cambio de app guardado: $packageName")
        } catch (e: Exception) {
            Log.e(TAG, "Error guardando cambio de app", e)
        }
    }
    
    override fun onInterrupt() {
        Log.d(TAG, "Service interrupted")
    }
    
    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.d(TAG, "✅✅✅ Accessibility service connected and ready ✅✅✅")
        Log.d(TAG, "Service info: ${serviceInfo}")
        Log.d(TAG, "Event types: ${serviceInfo?.eventTypes}")
        Log.d(TAG, "Feedback type: ${serviceInfo?.feedbackType}")
        Log.d(TAG, "Flags: ${serviceInfo?.flags}")
        
        // Intentar obtener el contexto del módulo si no está configurado
        if (reactContext == null) {
            Log.w(TAG, "⚠️ ReactContext no disponible al conectar el servicio - se configurará cuando el módulo se inicialice")
        } else {
            Log.d(TAG, "✅ ReactContext disponible, servicio listo para enviar eventos")
        }
        
        // Obtener app actual si existe
        val currentApp = prefs.getString(KEY_CURRENT_APP, null)
        if (currentApp != null) {
            Log.d(TAG, "📱 App actual detectada al conectar: $currentApp")
            currentAppPackage = currentApp
        } else {
            Log.d(TAG, "📱 No hay app guardada, esperando eventos...")
        }
        
        // Probar obtener la app actual usando UsageStats como fallback
        try {
            val usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
            val time = System.currentTimeMillis()
            val stats = usageStatsManager.queryUsageStats(
                android.app.usage.UsageStatsManager.INTERVAL_BEST,
                time - 1000 * 60, // Último minuto
                time
            )
            if (stats != null && stats.isNotEmpty()) {
                val mostRecent = stats.maxByOrNull { it.lastTimeUsed }
                if (mostRecent != null) {
                    Log.d(TAG, "📱 App más reciente (UsageStats): ${mostRecent.packageName}")
                }
            }
        } catch (e: Exception) {
            Log.d(TAG, "No se pudo obtener app desde UsageStats: ${e.message}")
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "Service destroyed")
    }
}

