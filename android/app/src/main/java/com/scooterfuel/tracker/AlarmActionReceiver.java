package com.scooterfuel.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Vibrator;
import android.app.NotificationManager;

public class AlarmActionReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if ("STOP_FUEL_ALARM".equals(intent.getAction())) {
            // 1. Kill vibration immediately
            Vibrator v = (Vibrator) context.getApplicationContext().getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) v.cancel();
            
            // 2. Clear all notification banners (Fuel ID and GPS ID)
            NotificationManager nm = (NotificationManager) context.getApplicationContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(7777); // Fuel Alarm ID
                nm.cancel(9999); // GPS Alert ID
            }
            
            // 3. Stop any background sound via JS Bridge (Thread-Safe)
            if (MainActivity.instance != null && MainActivity.instance.getBridge() != null) {
                MainActivity.instance.getBridge().getWebView().post(new Runnable() {
                    @Override
                    public void run() {
                        MainActivity.instance.getBridge().triggerWindowJSEvent("stopFuelAlarmEvent");
                    }
                });
                
                // 4. Also stop native ringtone if playing
                if (MainActivity.instance.currentRingtone != null && MainActivity.instance.currentRingtone.isPlaying()) {
                    MainActivity.instance.currentRingtone.stop();
                }
            }
        }
    }
}
