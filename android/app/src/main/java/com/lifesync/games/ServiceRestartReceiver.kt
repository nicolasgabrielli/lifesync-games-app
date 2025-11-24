package com.lifesync.games

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * BroadcastReceiver que reinicia el servicio de background si se detiene
 * Se activa cuando el dispositivo se reinicia o cuando el servicio se detiene
 */
class ServiceRestartReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "ServiceRestartReceiver"
    }
    
    override fun onReceive(context: Context, intent: Intent) {
        when (intent.action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_PACKAGE_REPLACED -> {
                Log.d(TAG, "Dispositivo reiniciado o app actualizada, verificando si se debe reiniciar servicio")
                restartServiceIfNeeded(context)
            }
            "com.lifesync.games.RESTART_SERVICE" -> {
                Log.d(TAG, "Reiniciando servicio por solicitud")
                restartServiceIfNeeded(context)
            }
        }
    }
    
    private fun restartServiceIfNeeded(context: Context) {
        try {
            // Verificar si el sensor está activo (guardado en SharedPreferences)
            val prefs = context.getSharedPreferences("LifeSyncSensors", Context.MODE_PRIVATE)
            val activeSensors = prefs.getStringSet("activeSensors", emptySet())
            
            // Si el sensor de app_sessions (ID "1") está activo, reiniciar el servicio
            if (activeSensors?.contains("1") == true) {
                Log.d(TAG, "Sensor de app_sessions está activo, reiniciando servicio de background")
                val serviceIntent = Intent(context, AppUsageBackgroundService::class.java)
                
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent)
                } else {
                    context.startService(serviceIntent)
                }
            } else {
                Log.d(TAG, "Sensor de app_sessions no está activo, no se reinicia el servicio")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error al reiniciar servicio", e)
        }
    }
}

