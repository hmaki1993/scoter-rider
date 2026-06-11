package com.scooterfuel.tracker;

import android.content.Intent;
import android.os.Build;
import android.service.quicksettings.TileService;

import androidx.annotation.RequiresApi;

@RequiresApi(api = Build.VERSION_CODES.N)
public class OdoSyncTileService extends TileService {

    @Override
    public void onClick() {
        super.onClick();
        
        // Start or communicate with the BackgroundTrackingService to show the floating overlay
        Intent serviceIntent = new Intent(this, BackgroundTrackingService.class);
        serviceIntent.setAction("ACTION_SHOW_SYNC_CARD");
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // BackgroundTrackingService is expected to be already running as a foreground service.
                // If it's already a foreground service, startService works fine.
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            e.printStackTrace();
            // Fallback
            try {
                startService(serviceIntent);
            } catch (Exception ignored) {}
        }

        // On Android 12+, ACTION_CLOSE_SYSTEM_DIALOGS throws SecurityException.
        // The overlay will naturally show on top of the notification shade.
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            try {
                Intent closeIntent = new Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS);
                sendBroadcast(closeIntent);
            } catch (Exception ignored) {}
        }
    }
}
