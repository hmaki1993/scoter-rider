package com.scooterfuel.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
            // Check if tracking was active before reboot (using the same key as JS)
            // Note: We'll need to make sure the JS 'was_tracking' is synced to SharedPreferences or use a native flag.
            // For now, we'll use 'was_tracking' which we will ensure is saved in updateNativeStats if needed.
            
            // Actually, let's look for the standard Capacitor/Preferences storage
            SharedPreferences capPrefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            String wasTracking = capPrefs.getString("was_tracking", "false");

            if ("true".equals(wasTracking)) {
                Intent serviceIntent = new Intent(context, BackgroundTrackingService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        }
    }
}
