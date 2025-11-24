package com.lifesync.games;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.util.Log;
import android.content.Context;
import android.content.SharedPreferences;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.facebook.react.bridge.ReactContext;
import org.json.JSONObject;
import org.json.JSONArray;

public class AppAccessibilityService extends AccessibilityService {
    private static final String TAG = "AppAccessibilityService";
    private static final String PREFS_NAME = "LifeSyncAppUsage";
    private static final String KEY_CURRENT_APP = "currentApp";
    private static final String KEY_APP_HISTORY = "appHistory";
    private static final String KEY_LAST_UPDATE = "lastUpdate";
    
    private static ReactContext reactContext;
    private static String currentAppPackage = null;
    private SharedPreferences prefs;
    
    public static void setReactContext(ReactContext context) {
        reactContext = context;
    }
    
    public static String getCurrentApp() {
        // Intentar obtener desde SharedPreferences si no está en memoria
        if (currentAppPackage == null && reactContext != null) {
            SharedPreferences prefs = reactContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            currentAppPackage = prefs.getString(KEY_CURRENT_APP, null);
        }
        return currentAppPackage;
    }
    
    @Override
    public void onCreate() {
        super.onCreate();
        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        // Cargar última app conocida
        currentAppPackage = prefs.getString(KEY_CURRENT_APP, null);
        Log.d(TAG, "Service created, last app: " + currentAppPackage);
    }
    
    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = String.valueOf(event.getPackageName());
            
            if (packageName != null && !packageName.equals(currentAppPackage)) {
                currentAppPackage = packageName;
                long timestamp = System.currentTimeMillis();
                Log.d(TAG, "App changed: " + packageName + " at " + timestamp);
                
                // Guardar en SharedPreferences para persistencia
                saveAppChange(packageName, timestamp);
                
                // Enviar evento a React Native si está disponible
                if (reactContext != null) {
                    try {
                        WritableMap params = Arguments.createMap();
                        params.putString("packageName", packageName);
                        params.putLong("timestamp", timestamp);
                        
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit("onAppChanged", params);
                    } catch (Exception e) {
                        Log.e(TAG, "Error sending event to React Native", e);
                    }
                } else {
                    Log.d(TAG, "ReactContext not available, event saved for later processing");
                }
            }
        }
    }
    
    /**
     * Guarda el cambio de app en SharedPreferences para persistencia
     */
    private void saveAppChange(String packageName, long timestamp) {
        try {
            SharedPreferences.Editor editor = prefs.edit();
            editor.putString(KEY_CURRENT_APP, packageName);
            editor.putLong(KEY_LAST_UPDATE, timestamp);
            
            // Guardar en historial (últimas 100 apps)
            String historyJson = prefs.getString(KEY_APP_HISTORY, "[]");
            try {
                JSONArray history = new JSONArray(historyJson);
                JSONObject entry = new JSONObject();
                entry.put("packageName", packageName);
                entry.put("timestamp", timestamp);
                history.put(entry);
                
                // Mantener solo las últimas 100 entradas
                if (history.length() > 100) {
                    JSONArray newHistory = new JSONArray();
                    for (int i = history.length() - 100; i < history.length(); i++) {
                        newHistory.put(history.get(i));
                    }
                    history = newHistory;
                }
                
                editor.putString(KEY_APP_HISTORY, history.toString());
            } catch (Exception e) {
                Log.e(TAG, "Error updating app history", e);
            }
            
            editor.apply();
            Log.d(TAG, "App change saved: " + packageName);
        } catch (Exception e) {
            Log.e(TAG, "Error saving app change", e);
        }
    }
    
    @Override
    public void onInterrupt() {
        Log.d(TAG, "Service interrupted");
    }
    
    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        Log.d(TAG, "Accessibility service connected");
    }
}

