package com.scooterfuel.tracker;

import android.os.Bundle;
import android.content.Intent;
import android.app.PendingIntent;
import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.content.Context;
import android.provider.Settings;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

public class MainActivity extends BridgeActivity {
    public Ringtone currentRingtone;
    public static String pendingWidgetAction = null;
    public static MainActivity instance;

    public void triggerStopEvent() {
        if (bridge != null) {
            bridge.triggerDocumentJSEvent("stopFuelAlarmEvent");
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        instance = this;
        registerPlugin(AlarmPlugin.class);
        super.onCreate(savedInstanceState);
        
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent intent) {
        if (intent != null && intent.hasExtra("widget_action")) {
            pendingWidgetAction = intent.getStringExtra("widget_action");
        }
    }

    @CapacitorPlugin(name = "AlarmPlugin")
    public static class AlarmPlugin extends Plugin {
        
        @PluginMethod
        public void getWidgetAction(PluginCall call) {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("action", pendingWidgetAction);
            pendingWidgetAction = null; // Clear after reading once
            call.resolve(ret);
        }
        @PluginMethod
        public void openLocationSettings(PluginCall call) {
            try {
                Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void checkGPS(PluginCall call) {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            try {
                android.location.LocationManager lm = (android.location.LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                boolean isEnabled = false;

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.P) {
                    isEnabled = lm.isLocationEnabled();
                } else {
                    boolean gps_enabled = false;
                    boolean network_enabled = false;
                    try {
                        gps_enabled = lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
                    } catch(Exception ex) {}
                    try {
                        network_enabled = lm.isProviderEnabled(android.location.LocationManager.NETWORK_PROVIDER);
                    } catch(Exception ex) {}
                    isEnabled = gps_enabled || network_enabled;
                }

                ret.put("enabled", isEnabled);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void openAppSettings(PluginCall call) {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
                intent.setData(uri);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void playAlarm(PluginCall call) {
            // Legacy method kept for compatibility — delegates to startVibration
            startVibration(call);
        }

        @PluginMethod
        public void showFuelPopup(PluginCall call) {
            try {
                String title = call.getString("title", "⚠️ Fuel Alert");
                String body = call.getString("body", "Low fuel");
                
                Intent notificationIntent = new Intent(getContext(), MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                        getContext(), 2, notificationIntent,
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
                );

                long[] pattern = {
                    0,   // Initial delay
                    400, 200, 400, 200, 800, // 1st round (ON, OFF, ON, OFF, ON)
                    500, // Wait before 2nd round (OFF)
                    400, 200, 400, 200, 800, // 2nd round (ON, OFF, ON, OFF, ON)
                    500, // Wait before 3rd round (OFF)
                    400, 200, 400, 200, 800  // 3rd round (ON, OFF, ON, OFF, ON)
                };

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    android.app.NotificationChannel alertChannel = new android.app.NotificationChannel(
                            "FuelTrackerAlertsV2",
                            "Fuel & GPS Alerts",
                            android.app.NotificationManager.IMPORTANCE_HIGH
                    );
                    alertChannel.setDescription("Urgent alerts for GPS loss and low fuel");
                    alertChannel.enableVibration(false); // Explicitly disable to avoid overlap
                    alertChannel.enableLights(true);
                    android.app.NotificationManager manager = getContext().getSystemService(android.app.NotificationManager.class);
                    if (manager != null) {
                        manager.createNotificationChannel(alertChannel);
                    }
                }

                android.content.Intent stopIntent = new android.content.Intent(getContext(), AlarmActionReceiver.class);
                stopIntent.setAction("STOP_FUEL_ALARM");
                android.app.PendingIntent stopPendingIntent = android.app.PendingIntent.getBroadcast(
                        getContext(), 3, stopIntent,
                        android.app.PendingIntent.FLAG_IMMUTABLE | android.app.PendingIntent.FLAG_UPDATE_CURRENT
                );

                android.app.Notification notification = new androidx.core.app.NotificationCompat.Builder(getContext(), "FuelTrackerAlertsV2")
                        .setContentTitle(title)
                        .setContentText(body)
                        .setSmallIcon(android.R.drawable.ic_dialog_info)
                        .setColor(0xFFE53935)
                        .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(body + "\n\n⚠️ Please refuel to prevent engine and tracking issues. Tap to add fuel."))
                        .setContentIntent(pendingIntent)
                        .addAction(android.R.drawable.ic_media_pause, "🛑 STOP", stopPendingIntent)
                        .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                        .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                        .setDefaults(androidx.core.app.NotificationCompat.DEFAULT_SOUND | androidx.core.app.NotificationCompat.DEFAULT_LIGHTS)
                        .setAutoCancel(true)
                        .build();

                android.app.NotificationManager manager = (android.app.NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
                if (manager != null) {
                    manager.notify(7777, notification);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void startVibration(PluginCall call) {
            try {
                // ── Start repeating vibration pattern ONLY (audio is handled by JS/WebAudio) ──
                Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    long[] pattern = {
                        0,   // Initial delay
                        400, 200, 400, 200, 800, // 1st round
                        500, // Wait
                        400, 200, 400, 200, 800, // 2nd round
                        500, // Wait
                        400, 200, 400, 200, 800  // 3rd round
                    }; 
                    if (android.os.Build.VERSION.SDK_INT >= 33) {
                        android.os.VibrationAttributes attrs = new android.os.VibrationAttributes.Builder()
                                .setUsage(android.os.VibrationAttributes.USAGE_ALARM)
                                .build();
                        v.vibrate(VibrationEffect.createWaveform(pattern, -1), attrs);
                    } else if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        android.media.AudioAttributes audioAttrs = new android.media.AudioAttributes.Builder()
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                                .build();
                        v.vibrate(VibrationEffect.createWaveform(pattern, -1), audioAttrs);
                    } else {
                        android.media.AudioAttributes audioAttrs = new android.media.AudioAttributes.Builder()
                                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                                .build();
                        v.vibrate(pattern, -1, audioAttrs);
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void stopAlarm(PluginCall call) {
            try {
                // Stop any legacy ringtone (if playAlarm was called directly before)
                MainActivity activity = (MainActivity) getActivity();
                if (activity != null && activity.currentRingtone != null && activity.currentRingtone.isPlaying()) {
                    activity.currentRingtone.stop();
                    activity.currentRingtone = null;
                }
                
                // Always stop the vibrator — this covers both startVibration and vibrateSimple calls
                Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.cancel();
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void vibrateSimple(PluginCall call) {
            try {
                Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createOneShot(500, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        v.vibrate(500);
                    }
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void startBackgroundTracking(PluginCall call) {
            try {
                Context context = getContext();
                Intent serviceIntent = new Intent(context, BackgroundTrackingService.class);
                
                // Clear old distance
                android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
                prefs.edit().putFloat("native_gps_distance", 0.0f).apply();

                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void stopBackgroundTracking(PluginCall call) {
            try {
                Context context = getContext();
                Intent serviceIntent = new Intent(context, BackgroundTrackingService.class);
                context.stopService(serviceIntent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void getNativeDistance(PluginCall call) {
            try {
                Context context = getContext();
                android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
                float dist = prefs.getFloat("native_gps_distance", 0.0f);
                
                // Reset it immediately after reading it
                prefs.edit().putFloat("native_gps_distance", 0.0f).apply();

                com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                ret.put("distanceKm", (double) dist);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void getWidgetSettings(PluginCall call) {
            try {
                Context context = getContext();
                android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
                
                com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
                ret.put("accentColor", WidgetStore.getColor(context));
                ret.put("opacity", WidgetStore.getOpacity(context));
                
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void updateWidgetStats(PluginCall call) {
            try {
                Context context = getContext();
                String range = call.getString("range", "0.0 KM");
                int fuelPercent = call.getDouble("fuelPercent", 0.0).intValue();
                String litersLeft = call.getString("litersLeft", "0.0 L");
                String emptyAt = call.getString("emptyAt", "EMPTY");
                String oilLeft = call.getString("oilLeft", "OIL: 0");
                String trip = call.getString("trip", "TRIP: 0");
                String budget = call.getString("budget", "0 EGP");
                // Read ODO string from React payload
                String odo = call.getString("odo", "ODO: 0");
                
                android.util.Log.d("FuelTrackerNative", "ODO received: " + odo);
                
                // 1. Telemetry Data
                android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", android.content.Context.MODE_PRIVATE);
                android.content.SharedPreferences.Editor editor = prefs.edit();
                
                editor.putString("latest_range", range);
                editor.putInt("latest_fuelPercent", fuelPercent);
                editor.putString("latest_litersLeft", litersLeft);
                editor.putString("latest_emptyAt", emptyAt);
                editor.putString("latest_oilLeft", oilLeft);
                editor.putString("latest_trip", trip);
                editor.putString("latest_budget", budget);
                editor.putString("latest_odo", odo);
                
                // NEW: PERSIST RAW DATA FOR BACKGROUND CALCULATION
                editor.putFloat("latest_fuelLiters_raw", (float)call.getDouble("fuelLitersRaw", 0.0).doubleValue());
                editor.putFloat("latest_oilLeft_raw", (float)call.getDouble("oilLeftRaw", 1000.0).doubleValue());
                editor.putFloat("latest_trip_raw", (float)call.getDouble("tripRaw", 0.0).doubleValue());
                editor.putFloat("latest_odo_raw", (float)call.getDouble("odoRaw", 0.0).doubleValue());
                editor.putFloat("setting_consumption", (float)call.getDouble("consumptionRate", 21.4).doubleValue());
                editor.putFloat("setting_tank", (float)call.getDouble("tankCapacity", 7.0).doubleValue());
                editor.putFloat("setting_warning_threshold", (float)call.getFloat("warningThreshold", 15.0f));
                
                editor.commit(); // Durable synchronous write

                // If React explicitly sent colors (manual in-app change), save them to WidgetStore
                if (call.getData().has("accentColor")) {
                    String newColor = call.getString("accentColor", "#00f0ff");
                    int newOpacity = call.getData().has("opacity") ? call.getInt("opacity", 100) : WidgetStore.getOpacity(context);
                    WidgetStore.saveDesign(context, newColor, newOpacity);
                }

                Intent intent = new Intent(context, SpeedometerWidget.class);
                intent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);

                // ALWAYS read from WidgetStore — the single source of truth
                intent.putExtra("accentColor", WidgetStore.getColor(context));
                intent.putExtra("opacity", WidgetStore.getOpacity(context));
                intent.putExtra("speed", call.getDouble("speed", 0.0).intValue());
                intent.putExtra("range", range);
                intent.putExtra("fuelPercent", fuelPercent);
                intent.putExtra("litersLeft", litersLeft);
                intent.putExtra("emptyAt", emptyAt);
                intent.putExtra("oilLeft", oilLeft);
                intent.putExtra("trip", trip);
                intent.putExtra("budget", budget);
                intent.putExtra("odoText", odo);

                context.sendBroadcast(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
