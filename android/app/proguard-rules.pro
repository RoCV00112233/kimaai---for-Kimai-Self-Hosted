# Kimaai R8 / ProGuard Obfuscation & Shrinking Rules (R8 Full Mode + Safe Package Repackaging)

# Repackage obfuscated classes into single-letter package 'o' to minimize DEX size
# while keeping Class.getPackage() non-null for Android ART & Jetpack reflection.
-repackageclasses 'o'

# Preserve line numbers, generics, and annotations for Play Console crash deobfuscation & reflection
-keepattributes SourceFile,LineNumberTable,Signature,InnerClasses,EnclosingMethod,*Annotation*,RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations
-renamesourcefileattribute SourceFile

# App entry point, FileProvider, and native plugins
-keep class com.kimaai.com.** { *; }
-keep class androidx.core.content.FileProvider { *; }

# Official Capacitor v3-v8 Plugin & Annotation Rules (with explicit <init>() for R8 Full Mode)
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    public <init>();
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod <methods>;
}
-keep public class * extends com.getcapacitor.Plugin {
    public <init>();
    *;
}
-keep @com.getcapacitor.NativePlugin public class * {
    public <init>();
    @com.getcapacitor.PluginMethod <methods>;
}
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.getcapacitor.** { *; }

# Cordova bridge included by Capacitor Android
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin {
    public <init>();
    *;
}

# Capacitor Geolocation & Ionic Location libraries
-keep class com.capacitorjs.** { *; }
-keep class io.ionic.libs.** { *; }

# AndroidX SplashScreen, Startup, Lifecycle, WebKit, CoordinatorLayout & AppCompat reflection safety
-keep class androidx.core.splashscreen.** { *; }
-keep class androidx.startup.** { *; }
-keep class * implements androidx.startup.Initializer {
    public <init>();
    *;
}
-keep class androidx.lifecycle.** { *; }
-keep class androidx.savedstate.** { *; }
-keep class androidx.webkit.** { *; }
-keep class androidx.coordinatorlayout.** { *; }
-keepclassmembers class * extends androidx.coordinatorlayout.widget.CoordinatorLayout$Behavior {
    public <init>(android.content.Context, android.util.AttributeSet);
    *;
}

# Preserve Enum values() / valueOf() for reflection & serialization in R8 Full Mode
-keepclassmembers class * extends java.lang.Enum {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Gson serialization (used by Capacitor Geolocation & Bridge)
-keep class com.google.gson.** { *; }
-keep class * implements com.google.gson.TypeAdapterFactory {
    public <init>();
}
-keep class * implements com.google.gson.JsonSerializer {
    public <init>();
}
-keep class * implements com.google.gson.JsonDeserializer {
    public <init>();
}
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken

# Google Play Services Location & Tasks
-keep class com.google.android.gms.location.** { *; }
-keep class com.google.android.gms.tasks.** { *; }
-keep class com.google.android.gms.common.** { *; }

# Kotlin & Coroutines (CRITICAL for Dispatchers.Main ServiceLoader in GeolocationPlugin.load())
-keep class kotlin.Metadata { *; }
-keep class kotlinx.coroutines.android.** { *; }
-keep class * implements kotlinx.coroutines.internal.MainDispatcherFactory {
    public <init>();
    *;
}
-keep class * implements kotlinx.coroutines.CoroutineExceptionHandler {
    public <init>();
    *;
}
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
