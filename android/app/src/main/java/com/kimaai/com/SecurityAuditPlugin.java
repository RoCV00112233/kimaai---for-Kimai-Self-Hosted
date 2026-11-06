package com.kimaai.com;

import android.content.pm.ApplicationInfo;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(name = "SecurityAudit")
public class SecurityAuditPlugin extends Plugin {

    private static final String[] ROOT_BINARY_PATHS = new String[] {
        "/system/bin/su",
        "/system/xbin/su",
        "/sbin/su",
        "/system/sd/xbin/su",
        "/system/bin/failsafe/su",
        "/data/local/xbin/su",
        "/data/local/bin/su",
        "/data/local/su",
        "/su/bin/su",
        "/sbin/.magisk",
        "/data/adb/magisk",
        "/system/app/Superuser.apk",
        "/system/etc/init.d/99SuperSUDaemon"
    };

    @PluginMethod
    public void checkDeviceSecurity(PluginCall call) {
        List<String> indicators = new ArrayList<>();

        String buildTags = Build.TAGS;
        if (buildTags != null && buildTags.contains("test-keys")) {
            indicators.add("test-keys");
        }

        for (String path : ROOT_BINARY_PATHS) {
            try {
                if (new File(path).exists()) {
                    indicators.add(path);
                }
            } catch (SecurityException ignored) {
                // Access denied by SELinux is expected on unrooted devices
            }
        }

        boolean isDebuggable =
            (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;

        JSObject ret = new JSObject();
        ret.put("isRooted", !indicators.isEmpty());
        ret.put("isDebuggable", isDebuggable);
        ret.put("indicators", new JSArray(indicators));
        call.resolve(ret);
    }
}
