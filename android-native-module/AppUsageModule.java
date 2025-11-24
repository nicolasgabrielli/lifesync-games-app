package com.lifesync.games;

import android.content.Context;
import android.content.Intent;
import android.provider.Settings;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.view.accessibility.AccessibilityManager;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

import java.util.List;

public class AppUsageModule extends ReactContextBaseJavaModule {
    private ReactApplicationContext reactContext;
    private static final String TAG = "AppUsageModule";
    
    public AppUsageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        AppAccessibilityService.setReactContext(reactContext);
    }
    
    @Override
    public String getName() {
        return "AppUsage";
    }
    
    @ReactMethod
    public void isAccessibilityServiceEnabled(Promise promise) {
        try {
            AccessibilityManager am = (AccessibilityManager) 
                reactContext.getSystemService(Context.ACCESSIBILITY_SERVICE);
            List<AccessibilityServiceInfo> enabledServices = 
                am.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK);
            
            String serviceName = reactContext.getPackageName() + "/.AppAccessibilityService";
            boolean isEnabled = false;
            
            for (AccessibilityServiceInfo service : enabledServices) {
                String enabledService = service.getId();
                if (enabledService.equals(serviceName)) {
                    isEnabled = true;
                    break;
                }
            }
            
            promise.resolve(isEnabled);
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
    
    @ReactMethod
    public void openAccessibilitySettings() {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }
    
    @ReactMethod
    public void openUsageStatsSettings() {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        reactContext.startActivity(intent);
    }
    
    @ReactMethod
    public void getCurrentApp(Promise promise) {
        // El servicio de accesibilidad enviará eventos cuando cambie la app
        // Por ahora retornamos null, la detección se hace por eventos
        String currentApp = AppAccessibilityService.getCurrentApp();
        if (currentApp != null) {
            promise.resolve(currentApp);
        } else {
            promise.resolve(null);
        }
    }
}

