package com.scooterfuel.tracker;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import androidx.core.app.RemoteInput;
import androidx.core.app.NotificationCompat;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

public class BackgroundTrackingService extends Service {

    private static final String CHANNEL_ID = "FuelTrackerChannel";
    private static final String ALERT_CHANNEL_ID = "FuelTrackerAlerts";
    private static final int NOTIFICATION_ID = 8888;
    private static final int GPS_WARNING_ID = 9999;
    
    private LocationManager locationManager;
    private Location lastLocation = null;
    private float accumulatedDistanceKm = 0.0f;
    private int lastBroadcastedSpeed = -1;
    private long lastBroadcastTime = 0;
    private boolean isScooterMode = true;
    private int scooterModeConfirmCount = 0;
    private long walkingDurationStart = 0;
    private float pendingDistanceKm = 0.0f;
    private long lastHighSpeedTime = 0;
    private long stopStartTime = 0;
    
    // --- Floating Overlay ---
    private FloatingOdoOverlay floatingOverlay;
    private FloatingAddFuelOverlay floatingAddFuelOverlay;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        
        IntentFilter filter = new IntentFilter(LocationManager.PROVIDERS_CHANGED_ACTION);
        registerReceiver(gpsReceiver, filter);

        // Initialize floating overlay
        floatingOverlay = new FloatingOdoOverlay(this);
        floatingAddFuelOverlay = new FloatingAddFuelOverlay(this);

    }

    @SuppressLint("MissingPermission")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "ACTION_SHOW_SYNC_CARD".equals(intent.getAction())) {
            triggerQuickSyncAction();
            return START_STICKY; // Don't re-setup notifications
        }
        
        if (intent != null && "ACTION_SHOW_ADD_FUEL_CARD".equals(intent.getAction())) {
            triggerQuickAddFuelAction();
            return START_STICKY;
        }

        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // --- NEW: REMOTE INPUT FOR QUICK ODO SYNC ---
        String replyLabel = "Enter current KM...";
        RemoteInput remoteInput = new RemoteInput.Builder("key_odo_sync")
                .setLabel(replyLabel)
                .build();

        Intent syncIntent = new Intent(this, AlarmActionReceiver.class);
        syncIntent.setAction("SYNC_ODO_ACTION");
        PendingIntent syncPendingIntent = PendingIntent.getBroadcast(
                this, 5, syncIntent,
                PendingIntent.FLAG_MUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Action syncAction = new NotificationCompat.Action.Builder(
                android.R.drawable.ic_menu_edit,
                "SYNC ODO",
                syncPendingIntent)
                .addRemoteInput(remoteInput)
                .build();

        SharedPreferences prefsFg = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        String langFg = prefsFg.getString("fuel_settings_language", "ar");
        String fgTitle = langFg.equals("ar") ? "🛵 متتبع الوقود — نشط" : "🛵 Fuel Tracker — Active";
        String fgBody  = langFg.equals("ar") ? "جارٍ رصد المشوار وحساب الوقود بدقة عالية." : "Monitoring your ride & calculating fuel consumption in real time.";

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle(fgTitle)
                .setContentText(fgBody)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
                .addAction(syncAction) // Add the "SYNC ODO" button with Input field
                .setOngoing(true)
                .build();

        // Important: Specify foreground service type Location for Android 14
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        startLocationTracking();

        return START_STICKY;
    }

    @SuppressLint("MissingPermission")
    private void startLocationTracking() {
        accumulatedDistanceKm = 0.0f;
        lastLocation = null;
        
        try {
            // Request location every 1 second (1000ms), 0 meters displacement for LIVE response
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    1000,
                    0.0f,
                    locationListener
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static final float MAX_ACCURACY_METERS = 100.0f; // Relaxed filter to avoid losing distance when phone is in pocket

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(@NonNull Location location) {
            try {
                // --- Accuracy Filter ---
                if (location.hasAccuracy() && location.getAccuracy() > MAX_ACCURACY_METERS) {
                    return; // Ignore low accuracy points
                }

                if (lastLocation != null) {
                    float distanceMeters = lastLocation.distanceTo(location);
                    float currentSpeedKmh = 0.0f;
                    long timeDeltaMs = Math.max(1000, location.getTime() - lastLocation.getTime());
                    
                    // 1. UI Speed Calculation
                    if (location.hasSpeed()) {
                        currentSpeedKmh = location.getSpeed() * 3.6f;
                    } else {
                        float hours = timeDeltaMs / (1000.0f * 60.0f * 60.0f);
                        currentSpeedKmh = (distanceMeters / 1000.0f) / hours;
                    }

                    int currentSpeedInt = Math.round(currentSpeedKmh >= 3.0f ? currentSpeedKmh : 0);
                    long now = System.currentTimeMillis();
                    
                    // Only broadcast if speed changed OR if 5 seconds passed (to sync other stats)
                    if (currentSpeedInt != lastBroadcastedSpeed || (now - lastBroadcastTime) > 5000) {
                        broadcastWidgetUpdate(currentSpeedInt);
                        lastBroadcastedSpeed = currentSpeedInt;
                        lastBroadcastTime = now;
                    }

                    // Use currentSpeedKmh for activity recognition because calculatedSpeedKmh can spike
                    float activeSpeed = currentSpeedKmh;

                    // --- Smart Activity Recognition (Scooter vs Walk) ---
                    if (activeSpeed >= 8.0f) {
                        scooterModeConfirmCount++;
                        if (scooterModeConfirmCount >= 4) {
                            isScooterMode = true;
                            walkingDurationStart = 0;
                            if (pendingDistanceKm > 0.0f) {
                                accumulatedDistanceKm += pendingDistanceKm;
                                updateNativeStats(pendingDistanceKm);
                                pendingDistanceKm = 0.0f;
                            }
                        }
                    } else {
                        scooterModeConfirmCount = 0;
                        isScooterMode = false;
                        
                        if (activeSpeed >= 1.0f) {
                            if (walkingDurationStart == 0) {
                                walkingDurationStart = now;
                            } else if (now - walkingDurationStart >= 45000) {
                                pendingDistanceKm = 0.0f;
                            }
                        } else {
                            // Pause timer when stopped
                            if (walkingDurationStart != 0) {
                                walkingDurationStart += timeDeltaMs;
                            }
                        }
                    }

                    // --- 2. Distance Accumulation (Smoothed) ---
                    if (distanceMeters >= 5.0f) {
                        float maxAllowedDistance = Math.max(150.0f, (timeDeltaMs / 1000.0f) * 41.6f);
                        if (distanceMeters < maxAllowedDistance) {
                            if (activeSpeed >= 1.0f) {
                                float distKm = (distanceMeters / 1000.0f);
                                if (isScooterMode) {
                                    accumulatedDistanceKm += distKm;
                                    updateNativeStats(distKm);
                                } else {
                                    pendingDistanceKm += distKm;
                                    if (pendingDistanceKm > 0.5f) pendingDistanceKm = 0.5f;
                                }
                            }
                            lastLocation = location;
                        } else {
                            lastLocation = location;
                        }
                    }
                } else {
                    lastLocation = location;
                }
            } catch (Exception e) {
                android.util.Log.e("FuelTracker", "Crash prevented in location update", e);
            }
        }

    };

    private void triggerQuickSyncAction() {
        // Vibrate to confirm detection
        Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null) {
            if (Build.VERSION.SDK_INT >= 26) {
                // Double-pulse vibration for clear feedback
                long[] pattern = { 0, 100, 80, 100 };
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(200);
            }
        }

        // Try to show floating overlay (works even with app in background)
        if (floatingOverlay != null && floatingOverlay.canDrawOverlays()) {
            if (!floatingOverlay.isShowing()) {
                floatingOverlay.show();
            }
        } else {
            // Fallback: Open app with sync intent (when overlay permission not granted)
            Intent intent = new Intent(this, MainActivity.class);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            intent.putExtra("widget_action", "open_sync_odo");

            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                    this, 100, intent,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
            );

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                        .setContentTitle("🔄 SYNC ODOMETER")
                        .setContentText("Shake detected! Tap to update mileage.")
                        .setSmallIcon(android.R.drawable.ic_menu_edit)
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_ALARM)
                        .setFullScreenIntent(fullScreenPendingIntent, true)
                        .setAutoCancel(true)
                        .setColor(0xFF00F0FF)
                        .build();
                nm.notify(1111, notification);
            }
            try {
                startActivity(intent);
            } catch (Exception e) {}
        }
    }

    private final BroadcastReceiver gpsReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (LocationManager.PROVIDERS_CHANGED_ACTION.equals(intent.getAction())) {
                boolean isGpsEnabled = false;
                if (locationManager != null) {
                    isGpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
                }
                if (!isGpsEnabled) {
                    showGpsDisabledNotification();
                }
            }
        }
    };

    private void updateNativeStats(float distKm) {
        SharedPreferences prefs = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        // 1. Update general unread distance for JS sync
        float currentStored = prefs.getFloat("native_gps_distance", 0.0f);
        editor.putFloat("native_gps_distance", currentStored + distKm);

        // 2. Performance Physics (Calculations - MATCHING REACT KM/L LOGIC)
        float kmPerLiter = prefs.getFloat("setting_consumption", 21.4f); // KM per Liter
        float currentLiters = prefs.getFloat("latest_fuelLiters_raw", 0.0f);
        float nextOilKm = prefs.getFloat("latest_oilLeft_raw", 1000.0f);
        float currentTrip = prefs.getFloat("latest_trip_raw", 0.0f);
        float currentOdo = prefs.getFloat("latest_odo_raw", 0.0f);
        float fuelPrice = prefs.getFloat("fuel_price_per_liter", 14.5f);

        // Subtract fuel and oil, Add Trip and Odo
        float consumedLiters = (kmPerLiter > 0) ? (distKm / kmPerLiter) : 0;
        float newLiters = Math.max(0, currentLiters - consumedLiters);
        float newOil = Math.max(0, nextOilKm - distKm);
        float newTrip = currentTrip + distKm;
        float newOdo = currentOdo >= 0 ? (currentOdo + distKm) : 0;

        // Recalculate Range & Budget
        float newRange = newLiters * kmPerLiter;
        float tankCap = prefs.getFloat("setting_tank", 7.0f);
        int fuelPercent = tankCap > 0 ? Math.round((newLiters / tankCap) * 100) : 0;
        
        // Budget logic matching React: Remaining = (Current L / Tank L) * Total Paid (approx)
        // For background simplicity, we'll use: Remaining L * Price (Better for live updates)
        float newBudget = newLiters * fuelPrice; // Use dynamic fuel price instead of hardcoded 14.5f

        // 3. Save for Widget & JS
        editor.putFloat("latest_fuelLiters_raw", newLiters);
        editor.putFloat("latest_oilLeft_raw", newOil);
        editor.putFloat("latest_trip_raw", newTrip);
        if (newOdo > 0) {
            editor.putFloat("latest_odo_raw", newOdo);
        }
        editor.putString("latest_range", String.format("%.1f KM", newRange));
        editor.putInt("latest_fuelPercent", fuelPercent);
        editor.putString("latest_litersLeft", String.format("%.1f L", newLiters));
        editor.putString("latest_oilLeft", String.format("OIL: %.0f", newOil));
        editor.putString("latest_trip", String.format("TRIP: %.1f", newTrip));
        editor.putString("latest_budget", String.format("%.0f EGP", newBudget));
        if (newOdo > 0) {
            editor.putString("latest_odo", String.format("ODO: %.0f", newOdo));
        }
        
        editor.apply();

        // --- NEW: OFFLINE ALERT TRIGGER ---
        float warningThresholdKm = prefs.getFloat("setting_warning_threshold", 15.0f);
        if (newRange <= (warningThresholdKm + 0.1f)) {
            int currentKmFloor = (int) Math.floor(newRange);
            int lastNotifiedKm = prefs.getInt("last_notified_km_native", 999);
            
            if (currentKmFloor < lastNotifiedKm) {
                showFuelNotificationNative(currentKmFloor);
                prefs.edit().putInt("last_notified_km_native", currentKmFloor).apply();
            }
        } else {
            // Reset tracker if fuel added
            if (newRange > warningThresholdKm + 5.0f) {
                prefs.edit().putInt("last_notified_km_native", 999).apply();
            }
        }
        
        // Reset local accumulator
        accumulatedDistanceKm = 0.0f; 
    }

    private void showFuelNotificationNative(int kmRemaining) {
        SharedPreferences prefs = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        String lang = prefs.getString("fuel_settings_language", "ar");
        
        String title = lang.equals("ar") ? "⛽ تحذير — الوقود على وشك النفاد" : "⛽ Critical Fuel Warning";
        String body = lang.equals("ar") ?
            String.format("متبقي تقريباً %d كم فقط. أعد التزود بالوقود الآن لتجنب توقف المحرك في الطريق.", kmRemaining) :
            String.format("Approximately %d KM of range remaining. Refuel now to avoid an unexpected breakdown on the road.", kmRemaining);

        // Intent to open App
        Intent intent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, intent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Action to Stop Alarm
        Intent stopIntent = new Intent(this, AlarmActionReceiver.class);
        stopIntent.setAction("STOP_FUEL_ALARM");
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
                this, 3, stopIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setColor(0xFFE53935)
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(body + "\n\n" + (lang.equals("ar") ? "👆 اضغط لتسجيل تعبئة وقود جديدة والحفاظ على دقة الحسابات." : "👆 Tap to log a new refuel and keep your fuel data accurate.")))
                .setContentIntent(pendingIntent)
                .addAction(android.R.drawable.ic_media_pause, lang.equals("ar") ? "🔕 كتم التنبيه" : "🔕 DISMISS", stopPendingIntent)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_LIGHTS)
                .setAutoCancel(true)
                .build();

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(7777, notification);
        }

        // Trigger Vibration matching the 3-round pattern in AlarmPlugin
        Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (v != null) {
            long[] pattern = {
                0, 400, 200, 400, 200, 800, 500,
                400, 200, 400, 200, 800, 500,
                400, 200, 400, 200, 800
            };
            if (Build.VERSION.SDK_INT >= 26) {
                v.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                v.vibrate(pattern, -1);
            }
        }
    }

    private void broadcastWidgetUpdate(int speed) {
        try {
            SharedPreferences prefs = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
            Intent intent = new Intent(this, SpeedometerWidget.class);
            intent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
            
            intent.putExtra("speed", speed);
            intent.putExtra("range", prefs.getString("latest_range", "-- KM"));
            intent.putExtra("fuelPercent", prefs.getInt("latest_fuelPercent", 0));
            intent.putExtra("litersLeft", prefs.getString("latest_litersLeft", "-- L"));
            intent.putExtra("emptyAt", prefs.getString("latest_emptyAt", "EMPTY: --"));
            intent.putExtra("oilLeft", prefs.getString("latest_oilLeft", "OIL: --"));
            intent.putExtra("trip", prefs.getString("latest_trip", "TRIP: --"));
            intent.putExtra("budget", prefs.getString("latest_budget", "-- EGP"));
            intent.putExtra("odo", prefs.getString("latest_odo", "ODO: --"));
            intent.putExtra("accentColor", WidgetStore.getColor(this));
            intent.putExtra("opacity", WidgetStore.getOpacity(this));
            
            sendBroadcast(intent);
        } catch (Exception e) {
            android.util.Log.e("FuelTracker", "Widget broadcast failed", e);
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            // Silent channel for background tracking status notification
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Background Tracking Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            // High-importance channel for GPS/Fuel alerts (shows as heads-up popups)
            NotificationChannel alertChannel = new NotificationChannel(
                    ALERT_CHANNEL_ID,
                    "Fuel & GPS Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            alertChannel.setDescription("Urgent alerts for GPS loss and low fuel");
            alertChannel.enableVibration(true);
            alertChannel.enableLights(true);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
                manager.createNotificationChannel(alertChannel);
            }
        }
    }

    private void showGpsDisabledNotification() {
        SharedPreferences prefs = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        String lang = prefs.getString("fuel_settings_language", "ar");

        String title = lang.equals("ar") ? "📍 تحذير — خدمة الموقع معطّلة" : "📍 Location Services Disabled";
        String body = lang.equals("ar") ?
            "تم إيقاف تتبع المشوار تلقائياً بسبب تعطيل الـ GPS. فعّل الموقع لاستئناف الحساب بدقة." :
            "Ride tracking has been paused because GPS is turned off. Enable location services to resume accurate distance monitoring.";

        Intent notificationIntent = new Intent(android.provider.Settings.ACTION_LOCATION_SOURCE_SETTINGS);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 1, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        // Stop action for the notification
        Intent stopIntent = new Intent(this, AlarmActionReceiver.class);
        stopIntent.setAction("STOP_FUEL_ALARM");
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
                this, 4, stopIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_map)
                .setColor(0xFFFF3B30) // Premium Red
                .setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(body + "\n\n" + (lang.equals("ar") ? "👆 اضغط لفتح إعدادات الموقع مباشرةً." : "👆 Tap to open Location Settings immediately.")))
                .setContentIntent(pendingIntent)
                .addAction(android.R.drawable.ic_media_pause, lang.equals("ar") ? "🔕 كتم التنبيه" : "🔕 DISMISS", stopPendingIntent)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .build();

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.notify(9999, notification);
        }

        // Force a loud notification sound (since channel changes don't always apply retroactively on some Android versions)
        try {
            android.media.Ringtone r = android.media.RingtoneManager.getRingtone(
                    getApplicationContext(), 
                    android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_NOTIFICATION)
            );
            if (r != null) r.play();
        } catch (Exception e) {}
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            locationManager.removeUpdates(locationListener);
        }
        try {
            unregisterReceiver(gpsReceiver);
        } catch (IllegalArgumentException e) {
            // Already unregistered
        }
        // Dismiss floating overlay
        if (floatingOverlay != null) {
            floatingOverlay.dismiss();
            floatingOverlay = null;
        }
        if (floatingAddFuelOverlay != null) {
            floatingAddFuelOverlay.dismiss();
            floatingAddFuelOverlay = null;
        }
    }

    private void triggerQuickAddFuelAction() {
        if (floatingAddFuelOverlay != null && !floatingAddFuelOverlay.isShowing()) {
            floatingAddFuelOverlay.show();
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // This is called when the user swipes away the app from recents.
        // We schedule a restart of the service in 1 second to ensure it keeps tracking.
        Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
        restartServiceIntent.setPackage(getPackageName());
        
        PendingIntent restartServicePendingIntent = PendingIntent.getService(
            getApplicationContext(), 1, restartServiceIntent, 
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );
        
        android.app.AlarmManager alarmService = (android.app.AlarmManager) getApplicationContext().getSystemService(Context.ALARM_SERVICE);
        if (alarmService != null) {
            alarmService.set(
                android.app.AlarmManager.RTC_WAKEUP,
                System.currentTimeMillis() + 1000,
                restartServicePendingIntent
            );
        }
        
        super.onTaskRemoved(rootIntent);
    }
}
