# Kimaai R8 / ProGuard Obfuscation & Shrinking Rules

# Preserve line numbers, generics, and annotations for Play Console crash deobfuscation & reflection
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*
-renamesourcefileattribute SourceFile

# Official Capacitor v3-v8 Plugin & Annotation Rules
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep @com.getcapacitor.NativePlugin public class * {
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }

# Cordova bridge included by Capacitor Android
-keep public class * extends org.apache.cordova.* {
    public <methods>;
    public <fields>;
}

# Capacitor Geolocation & Ionic Location libraries
-keep class com.capacitorjs.plugins.geolocation.** { *; }
-keep class io.ionic.libs.** { *; }

# App entry point and native plugins
-keep class com.kimaai.com.MainActivity { *; }
-keep class com.kimaai.com.SecurityAuditPlugin { *; }

# Gson serialization (used by Capacitor Geolocation & Bridge)
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory
-keep class * implements com.google.gson.JsonSerializer
-keep class * implements com.google.gson.JsonDeserializer
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken

# Google Play Services Location & Tasks
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.tasks.** { *; }

# Kotlin & Coroutines
-keep class kotlin.Metadata { *; }
-keepnames class kotlinx.coroutines.internal.MainDispatcherFactory {}
-keepnames class kotlinx.coroutines.CoroutineExceptionHandler {}
-keepclassmembers class kotlinx.coroutines.** {
    volatile <fields>;
}

# Suppress R8 missing-class errors for optional JVM / compile-only annotations & transitive refs
-dontwarn sun.misc.**
-dontwarn java.lang.instrument.**
-dontwarn java.lang.management.**
-dontwarn javax.annotation.**
-dontwarn org.apache.http.**
-dontwarn org.apache.cordova.**
-dontwarn com.google.gson.**
-dontwarn com.google.android.gms.**
-dontwarn com.google.errorprone.**
-dontwarn org.checkerframework.**
-dontwarn org.jetbrains.annotations.**
-dontwarn org.jspecify.**
-dontwarn kotlin.**
-dontwarn kotlinx.**
-dontwarn androidx.**
-dontwarn io.ionic.libs.**
-dontwarn com.capacitorjs.**
-dontwarn com.getcapacitor.**
