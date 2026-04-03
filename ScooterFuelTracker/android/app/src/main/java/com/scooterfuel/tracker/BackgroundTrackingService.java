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

    private static final float MIN_SPEED_KMH = 5.0f; // Lowered to 5 for "Live" feeling as requested
    private static final float MAX_ACCURACY_METERS = 20.0f;

    private final LocationListener locationListener = new LocationListener() {
        @Override
        public void onLocationChanged(@NonNull Location location) {
            // --- Accuracy Filter ---
            if (location.hasAccuracy() && location.getAccuracy() > MAX_ACCURACY_METERS) {
                return; // Ignore low accuracy points
            }

            if (lastLocation != null) {
                float distanceMeters = lastLocation.distanceTo(location);
                
                float currentSpeedKmh = 0.0f;
                if (location.hasSpeed()) {
                    currentSpeedKmh = location.getSpeed() * 3.6f;
                } else {
                    long timeDeltaMs = location.getTime() - lastLocation.getTime();
                    if (timeDeltaMs > 0 && timeDeltaMs < 30000) {
                        float hours = timeDeltaMs / (1000.0f * 60.0f * 60.0f);
                        currentSpeedKmh = (distanceMeters / 1000.0f) / hours;
                    }
                }

                if (location.hasSpeed() && location.getSpeed() * 3.6f < 3.0f && currentSpeedKmh > 10.0f) {
                    currentSpeedKmh = location.getSpeed() * 3.6f;
                }

                if (distanceMeters > 5.0f && distanceMeters < 150.0f) {
                    if (currentSpeedKmh >= MIN_SPEED_KMH) {
                        float distKm = (distanceMeters / 1000.0f);
                        accumulatedDistanceKm += distKm;
                        
                        // --- LIVE BACKGROUND NATIVE UPDATES ---
                        updateNativeStats(distKm);
                    }
                }

                broadcastWidgetUpdate(Math.round(currentSpeedKmh));
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
        float fuelPrice = prefs.getFloat("fuel_price_per_liter", 14.5f);

        // Subtract fuel and oil, Add Trip
        float consumedLiters = (kmPerLiter > 0) ? (distKm / kmPerLiter) : 0;
        float newLiters = Math.max(0, currentLiters - consumedLiters);
        float newOil = Math.max(0, nextOilKm - distKm);
        float newTrip = currentTrip + distKm;

        // Recalculate Range & Budget
        float newRange = newLiters * kmPerLiter;
        int fuelPercent = prefs.getInt("setting_tank", 7) > 0 ? Math.round((newLiters / prefs.getFloat("setting_tank", 7.0f)) * 100) : 0;
        
        // Budget logic matching React: Remaining = (Current L / Tank L) * Total Paid (approx)
        // For background simplicity, we'll use: Remaining L * Price (Better for live updates)
        float newBudget = newLiters * 14.5f; // Using default price fallback

        // 3. Save for Widget & JS
        editor.putFloat("latest_fuelLiters_raw", newLiters);
        editor.putFloat("latest_oilLeft_raw", newOil);
        editor.putFloat("latest_trip_raw", newTrip);
        editor.putString("latest_range", String.format("%.1f KM", newRange));
        editor.putInt("latest_fuelPercent", fuelPercent);
        editor.putString("latest_litersLeft", String.format("%.1f L", newLiters));
        editor.putString("latest_oilLeft", String.format("OIL: %.0f", newOil));
        editor.putString("latest_trip", String.format("TRIP: %.1f", newTrip));
        editor.putString("latest_budget", String.format("%.0f EGP", newBudget));
        
        editor.apply();
        
        // Reset local accumulator
        accumulatedDistanceKm = 0.0f; 
    }

    private void broadcastWidgetUpdate(int speed) {
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
        intent.putExtra("accentColor", prefs.getString("latest_accentColor", "#00f0ff"));
        intent.putExtra("opacity", prefs.getInt("latest_opacity", 100));
        
        sendBroadcast(intent);
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
