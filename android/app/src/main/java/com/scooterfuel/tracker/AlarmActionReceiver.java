package com.scooterfuel.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Vibrator;
import android.app.NotificationManager;

import androidx.core.app.RemoteInput;
import android.os.Bundle;
import android.content.SharedPreferences;

public class AlarmActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        
        if ("STOP_FUEL_ALARM".equals(action)) {
            // ... existing stop logic ...
            Vibrator v = (Vibrator) context.getApplicationContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.cancel();
            NotificationManager nm = (NotificationManager) context.getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(7777);
                nm.cancel(9999);
            }
            MainActivity activity = MainActivity.getInstance();
            if (activity != null && activity.getBridge() != null) {
                activity.getBridge().getWebView().post(() -> {
                    MainActivity activityInner = MainActivity.getInstance();
                    if (activityInner != null && activityInner.getBridge() != null) {
                        activityInner.getBridge().triggerWindowJSEvent("stopFuelAlarmEvent");
                    }
                });
            }
        } else if ("SYNC_ODO_ACTION".equals(action)) {
            Bundle remoteInput = RemoteInput.getResultsFromIntent(intent);
            if (remoteInput != null) {
                CharSequence odoValue = remoteInput.getCharSequence("key_odo_sync");
                if (odoValue != null) {
                    try {
                        float newOdo = Float.parseFloat(odoValue.toString());
                        SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
                        
                        // Update SharedPrefs for Native & JS Bridge
                        SharedPreferences.Editor editor = prefs.edit();
                        editor.putFloat("latest_odo_raw", newOdo);
                        editor.putString("latest_odo", String.format("ODO: %.0f", newOdo));
                        editor.apply();
                        
                        // Trigger JS update if app is alive
                        MainActivity activity = MainActivity.getInstance();
                        if (activity != null && activity.getBridge() != null) {
                            activity.getBridge().getWebView().post(() -> {
                                MainActivity activityInner = MainActivity.getInstance();
                                if (activityInner != null && activityInner.getBridge() != null) {
                                    activityInner.getBridge().triggerWindowJSEvent("nativeOdoUpdate", "{ \"odo\": " + newOdo + " }");
                                }
                            });
                        }

                        // Update the persistent notification to show success
                        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                        if (nm != null) {
                            // We need to notify the service notification again to clear the "typing" indicator in some Android versions
                            // But usually, just resolving the RemoteInput is enough.
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        }
    }
}
