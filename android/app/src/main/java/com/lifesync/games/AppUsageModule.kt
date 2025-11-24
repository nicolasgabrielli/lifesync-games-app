package com.lifesync.games

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.provider.Settings
import android.accessibilityservice.AccessibilityServiceInfo
import android.view.accessibility.AccessibilityManager
import android.app.AppOpsManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.Arguments
import org.json.JSONArray
import org.json.JSONObject

class AppUsageModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    private val reactContext: ReactApplicationContext = reactContext
    
    init {
        AppAccessibilityService.setReactContext(reactContext)
        AppUsageBackgroundService.setReactContext(reactContext)
        android.util.Log.d("AppUsageModule", "Módulo inicializado, contexto configurado en servicios")
        
        // También actualizar el contexto cuando el módulo esté listo
        reactContext.addLifecycleEventListener(object : com.facebook.react.bridge.LifecycleEventListener {
            override fun onHostResume() {
                android.util.Log.d("AppUsageModule", "App resumida, actualizando contexto en servicios")
                AppAccessibilityService.setReactContext(reactContext)
                AppUsageBackgroundService.setReactContext(reactContext)
            }
            
            override fun onHostPause() {
                // No hacer nada
            }
            
            override fun onHostDestroy() {
                // No hacer nada
            }
        })
    }
    
    override fun getName(): String {
        return "AppUsage"
    }
    
    @ReactMethod
    fun isAccessibilityServiceEnabled(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as AccessibilityManager
            val enabledServices = am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            
            val serviceName = "${reactContext.packageName}/.AppAccessibilityService"
            var isEnabled = false
            
            for (service in enabledServices) {
                val enabledService = service.id
                if (enabledService == serviceName) {
                    isEnabled = true
                    break
                }
            }
            
            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
    }
    
    @ReactMethod
    fun openUsageStatsSettings() {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactContext.startActivity(intent)
    }
    
    @ReactMethod
    fun getCurrentApp(promise: Promise) {
        // Primero intentar desde AccessibilityService
        var currentApp = AppAccessibilityService.getCurrentApp()
        
        // Si no hay app desde AccessibilityService, usar UsageStatsManager como fallback
        if (currentApp == null) {
            try {
                val usageStatsManager = reactContext.getSystemService(Context.USAGE_STATS_SERVICE) as android.app.usage.UsageStatsManager
                val time = System.currentTimeMillis()
                val stats = usageStatsManager.queryUsageStats(
                    android.app.usage.UsageStatsManager.INTERVAL_BEST,
                    time - 1000 * 60, // Último minuto
                    time
                )
                if (stats != null && stats.isNotEmpty()) {
                    val mostRecent = stats.maxByOrNull { it.lastTimeUsed }
                    if (mostRecent != null && mostRecent.lastTimeUsed >= time - 5000) { // Usado en últimos 5 segundos
                        currentApp = mostRecent.packageName
                        android.util.Log.d("AppUsageModule", "App obtenida desde UsageStats: $currentApp")
                    }
                }
            } catch (e: Exception) {
                android.util.Log.e("AppUsageModule", "Error obteniendo app desde UsageStats", e)
            }
        }
        
        promise.resolve(currentApp)
    }
    
    @ReactMethod
    fun startBackgroundPolling(promise: Promise) {
        try {
            android.util.Log.d("AppUsageModule", "Iniciando servicio de background para polling")
            val intent = Intent(reactContext, AppUsageBackgroundService::class.java)
            
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("AppUsageModule", "Error iniciando servicio de background", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun stopBackgroundPolling(promise: Promise) {
        try {
            android.util.Log.d("AppUsageModule", "Deteniendo servicio de background")
            val intent = Intent(reactContext, AppUsageBackgroundService::class.java)
            reactContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun saveActiveSensors(sensorIds: ReadableArray, promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("LifeSyncSensors", Context.MODE_PRIVATE)
            val editor = prefs.edit()
            val sensorIdSet = mutableSetOf<String>()
            
            for (i in 0 until sensorIds.size()) {
                val sensorId = sensorIds.getString(i)
                if (sensorId != null) {
                    sensorIdSet.add(sensorId)
                }
            }
            
            editor.putStringSet("activeSensors", sensorIdSet)
            editor.apply()
            
            android.util.Log.d("AppUsageModule", "Sensores activos guardados en SharedPreferences: $sensorIdSet")
            promise.resolve(true)
        } catch (e: Exception) {
            android.util.Log.e("AppUsageModule", "Error guardando sensores activos", e)
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun hasUsageStatsPermission(promise: Promise) {
        try {
            // Verificar si tenemos permiso de UsageStats
            // Esto requiere que el usuario haya otorgado el permiso manualmente
            val context = reactContext.applicationContext
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = appOps.checkOpNoThrow(
                AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(),
                context.packageName
            )
            val hasPermission = mode == AppOpsManager.MODE_ALLOWED
            promise.resolve(hasPermission)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
    
    @ReactMethod
    fun getSavedAppHistory(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences("LifeSyncAppUsage", Context.MODE_PRIVATE)
            val historyJson = prefs.getString("appHistory", "[]")
            val lastUpdate = prefs.getLong("lastUpdate", 0)
            val currentApp = prefs.getString("currentApp", null)
            
            val result = Arguments.createMap()
            result.putString("currentApp", currentApp)
            result.putDouble("lastUpdate", lastUpdate.toDouble())
            
            // Parsear historial JSON
            val historyArray = Arguments.createArray()
            if (historyJson != null && historyJson.isNotEmpty()) {
                try {
                    val jsonArray = JSONArray(historyJson)
                    for (i in 0 until jsonArray.length()) {
                        val entry = jsonArray.getJSONObject(i)
                        val entryMap = Arguments.createMap()
                        entryMap.putString("packageName", entry.getString("packageName"))
                        entryMap.putDouble("timestamp", entry.getLong("timestamp").toDouble())
                        historyArray.pushMap(entryMap)
                    }
                } catch (e: Exception) {
                    android.util.Log.e("AppUsageModule", "Error parsing app history", e)
                }
            }
            
            result.putArray("history", historyArray)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message ?: "Unknown error")
        }
    }
}

