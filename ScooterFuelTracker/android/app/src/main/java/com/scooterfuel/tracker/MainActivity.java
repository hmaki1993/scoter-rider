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
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    public Ringtone currentRingtone;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the local "AlarmPlugin" before super
        registerPlugin(AlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @CapacitorPlugin(name = "AlarmPlugin")
    public static class AlarmPlugin extends Plugin {

        @PluginMethod
        public void checkGpsEnabled(PluginCall call) {
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            try {
                android.location.LocationManager lm = (android.location.LocationManager) getContext().getSystemService(Context.LOCATION_SERVICE);
                boolean gps_enabled = false;
                try {
                    gps_enabled = lm.isProviderEnabled(android.location.LocationManager.GPS_PROVIDER);
                } catch(Exception ex) {}
                ret.put("enabled", gps_enabled);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
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
            try {
                Uri notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (notification == null) {
                    notification = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }
                
                MainActivity activity = (MainActivity) getActivity();
                if (activity.currentRingtone != null && activity.currentRingtone.isPlaying()) {
                    activity.currentRingtone.stop();
                }

                activity.currentRingtone = RingtoneManager.getRingtone(getContext(), notification);
                
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                   AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                   activity.currentRingtone.setAudioAttributes(aa);
                }
                
                activity.currentRingtone.play();
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void stopAlarm(PluginCall call) {
            MainActivity activity = (MainActivity) getActivity();
            if (activity.currentRingtone != null && activity.currentRingtone.isPlaying()) {
                activity.currentRingtone.stop();
            }
            call.resolve();
        }

        @PluginMethod
        public void vibrateSimple(PluginCall call) {
            Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                call.reject(e.getMessage());
            }
        }

        /**
         * Opens the app's specific settings page in Android.
         * The user can change Location from "While using" to "Allow all the time" here.
         * This is the only way to request background location on Android 11+.
         */
        @PluginMethod
        public void openAppSettings(PluginCall call) {
            try {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(android.net.Uri.fromParts("package", getContext().getPackageName(), null));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }
    }
}
