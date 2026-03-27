package com.scooterfuel.tracker;

import android.media.AudioAttributes;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.content.Context;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private Ringtone currentRingtone;

    @Override
    public void onStart() {
        super.onStart();
        // Register the local "AlarmPlugin"
        registerPlugin(AlarmPlugin.class);
    }

    @CapacitorPlugin(name = "AlarmPlugin")
    public class AlarmPlugin extends Plugin {
        @PluginMethod
        public void playAlarm(PluginCall call) {
            try {
                if (currentRingtone != null && currentRingtone.isPlaying()) {
                    currentRingtone.stop();
                }

                Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                if (alarmUri == null) {
                    alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
                }

                currentRingtone = RingtoneManager.getRingtone(getContext(), alarmUri);
                
                // Set to use Alarm Stream (overrides silent/media volume usually)
                AudioAttributes aa = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                currentRingtone.setAudioAttributes(aa);
                currentRingtone.play();

                // Aggressive vibration
                Vibrator v = (Vibrator) getContext().getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null) {
                    v.vibrate(VibrationEffect.createWaveform(new long[]{0, 500, 200, 500, 200, 500}, -1));
                }

                call.resolve();
            } catch (Exception e) {
                call.reject(e.getMessage());
            }
        }

        @PluginMethod
        public void stopAlarm(PluginCall call) {
            if (currentRingtone != null && currentRingtone.isPlaying()) {
                currentRingtone.stop();
            }
            call.resolve();
        }
    }
}
