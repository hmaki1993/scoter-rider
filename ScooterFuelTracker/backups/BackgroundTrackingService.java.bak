package com.scooterfuel.tracker;

import android.annotation.SuppressLint;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

public class BackgroundTrackingService extends Service {

    private static final String CHANNEL_ID = "FuelTrackerChannel";
    private static final int NOTIFICATION_ID = 8888;
    
    private LocationManager locationManager;
    private Location lastLocation = null;
    private float accumulatedDistanceKm = 0.0f;

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
    }

    @SuppressLint("MissingPermission")
    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("Scooter Fuel Tracker")
                .setContentText("Tracking distance in background...")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentIntent(pendingIntent)
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
            // Request location every 5 seconds, minimum 1 meter displacement
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    5000,
                    1.0f,
                    locationListener
            );
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static final float MIN_SPEED_KMH = 12.0f;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(@NonNull Location location) {
            if (lastLocation != null) {
                // Returns distance in meters
                float distanceMeters = lastLocation.distanceTo(location);
                
                // --- Speed Filter Logic (Filter Walking/Running) ---
                float currentSpeedKmh = 0.0f;
                if (location.hasSpeed()) {
                    currentSpeedKmh = location.getSpeed() * 3.6f;
                } else {
                    // Fallback: calculate speed from distance and time
                    long timeDeltaMs = location.getTime() - lastLocation.getTime();
                    if (timeDeltaMs > 0) {
                        float hours = timeDeltaMs / (1000.0f * 60.0f * 60.0f);
                        currentSpeedKmh = (distanceMeters / 1000.0f) / hours;
                    }
                }

                // Basic filter: ignore absurd GPS jumps and WALKING speeds
                if (distanceMeters > 5.0f && distanceMeters < 150.0f) {
                    if (currentSpeedKmh >= MIN_SPEED_KMH) {
                        accumulatedDistanceKm += (distanceMeters / 1000.0f);
                        saveAccumulatedDistance(accumulatedDistanceKm);
                    }
                }
            }
            lastLocation = location;
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {}
        @Override
        public void onProviderEnabled(@NonNull String provider) {}
        @Override
        public void onProviderDisabled(@NonNull String provider) {}
    };

    private void saveAccumulatedDistance(float dist) {
        SharedPreferences prefs = getSharedPreferences("FuelTrackerPrefs", MODE_PRIVATE);
        // We add to whatever might already be unread
        float currentStored = prefs.getFloat("native_gps_distance", 0.0f);
        SharedPreferences.Editor editor = prefs.edit();
        editor.putFloat("native_gps_distance", currentStored + dist);
        editor.apply();
        
        // Reset local accumulator strictly after saving
        accumulatedDistanceKm = 0.0f; 
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel serviceChannel = new NotificationChannel(
                    CHANNEL_ID,
                    "Background Tracking Service",
                    NotificationManager.IMPORTANCE_LOW
            );
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(serviceChannel);
            }
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (locationManager != null) {
            locationManager.removeUpdates(locationListener);
        }
    }
}
