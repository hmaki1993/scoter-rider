package com.scooterfuel.tracker;

import android.os.Bundle;
import android.content.Intent;
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

    @Override
    public void onCreate(Bundle savedInstanceState) {
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
        public void startVibration(PluginCall call) {
            try {
                // ── Start repeating vibration pattern ONLY (audio is handled by JS/WebAudio) ──
                Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    long[] pattern = {
                        0, 400, 200, 400, 200, 800, 500, // 1st
                        0, 400, 200, 400, 200, 800, 500, // 2nd
                        0, 400, 200, 400, 200, 800, 500  // 3rd
                    }; 
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        v.vibrate(VibrationEffect.createWaveform(pattern, -1)); // -1 = do not repeat
                    } else {
                        v.vibrate(pattern, -1);
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
        public void updateWidgetStats(PluginCall call) {
            try {
                Context context = getContext();
                String range = call.getString("range", "0.0 KM");
                int fuelPercent = call.getDouble("fuelPercent", 0.0).intValue();
                String litersLeft = call.getString("litersLeft", "0.0 L");
                String emptyAt = call.getString("emptyAt", "EMPTY");
                String oilLeft = call.getString("oilLeft", "OIL: 0 KM");
                String accentColor = call.getString("accentColor", "#00f0ff");
                int opacity = call.getInt("opacity", 100);

                // Persist stats so Background Service can update the widget with context
                android.content.SharedPreferences.Editor editor = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE).edit();
                editor.putString("latest_range", range);
                editor.putInt("latest_fuelPercent", fuelPercent);
                editor.putString("latest_litersLeft", litersLeft);
                editor.putString("latest_emptyAt", emptyAt);
                editor.putString("latest_oilLeft", oilLeft);
                editor.putString("latest_accentColor", accentColor);
                editor.putInt("latest_opacity", opacity);
                editor.apply();

                Intent intent = new Intent(context, SpeedometerWidget.class);
                intent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
                intent.putExtra("speed", call.getDouble("speed", 0.0).intValue());
                intent.putExtra("range", range);
                intent.putExtra("fuelPercent", fuelPercent);
                intent.putExtra("litersLeft", litersLeft);
                intent.putExtra("emptyAt", emptyAt);
                intent.putExtra("oilLeft", oilLeft);
                intent.putExtra("isDanger", call.getBoolean("isDanger", false));
                intent.putExtra("isWarning", call.getBoolean("isWarning", false));
                intent.putExtra("accentColor", accentColor);
                intent.putExtra("opacity", opacity);

                context.sendBroadcast(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
