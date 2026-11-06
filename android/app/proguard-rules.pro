# Kimaai R8 / ProGuard Obfuscation & Shrinking Rules

# Preserve line numbers for Play Console crash deobfuscation while hiding original source filenames
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep Capacitor Core, Bridge, and Plugin annotations
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Capacitor Geolocation & Ionic Location libraries
-keep class com.capacitorjs.plugins.geolocation.** { *; }
-keep class io.ionic.libs.** { *; }

# Keep App entry point and native plugins
-keep class com.kimaai.com.MainActivity { *; }
-keep class com.kimaai.com.SecurityAuditPlugin { *; }

# Gson serialization used by Capacitor Geolocation & Bridge
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer

# Google Play Services Location & Tasks
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-dontwarn com.google.android.gms.**

# Kotlin Coroutines
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-dontwarn kotlinx.coroutines.**

# Strip verbose/debug Android logs in release builds
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int d(...);
    public static int i(...);
}
