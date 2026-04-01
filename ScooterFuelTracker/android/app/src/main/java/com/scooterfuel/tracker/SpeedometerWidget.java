package com.scooterfuel.tracker;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.widget.RemoteViews;

public class SpeedometerWidget extends AppWidgetProvider {

    public static final String ACTION_UPDATE_STATS = "com.scooterfuel.tracker.ACTION_UPDATE_STATS";

    static void updateAppWidget(android.content.Context context, android.appwidget.AppWidgetManager appWidgetManager, int appWidgetId, android.content.Intent intent) {
        android.widget.RemoteViews views = new android.widget.RemoteViews(context.getPackageName(), com.scooterfuel.tracker.R.layout.widget_speedometer);

        // Click on widget -> Open App
        android.content.Intent mainIntent = new android.content.Intent(context, MainActivity.class);
        android.app.PendingIntent pendingIntent = android.app.PendingIntent.getActivity(context, 0, mainIntent,
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(com.scooterfuel.tracker.R.id.top_row, pendingIntent);

        // Settings Button -> Open App + Extra Instruction
        android.content.Intent configIntent = new android.content.Intent(context, MainActivity.class);
        configIntent.putExtra("widget_action", "open_settings");
        configIntent.setFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP);
        android.app.PendingIntent configPendingIntent = android.app.PendingIntent.getActivity(context, appWidgetId + 1000, configIntent, 
                android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(com.scooterfuel.tracker.R.id.widget_btn_settings, configPendingIntent);

        // Default values from SharedPreferences (Cached Stats)
        android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", android.content.Context.MODE_PRIVATE);
        
        int speed = 0;
        String range = prefs.getString("latest_range", "-- KM");
        int fuelPercent = prefs.getInt("latest_fuelPercent", 0);
        String litersLeft = prefs.getString("latest_litersLeft", "-- L");
        String emptyAt = prefs.getString("latest_emptyAt", "EMPTY: --");
        String oilLeft = prefs.getString("latest_oilLeft", "OIL: -- KM");
        String accentColorStr = prefs.getString("latest_accentColor", "#00f0ff");
        int opacity = prefs.getInt("latest_opacity", 100);
        int themeColor = android.graphics.Color.parseColor("#00f0ff");
        try { themeColor = android.graphics.Color.parseColor(accentColorStr); } catch (Exception ignored) {}

        // Override with Live Intent data if it's a broadcast
        if (intent != null && ACTION_UPDATE_STATS.equals(intent.getAction())) {
            speed = intent.getIntExtra("speed", 0);
            range = intent.getStringExtra("range") != null ? intent.getStringExtra("range") : range;
            fuelPercent = intent.getIntExtra("fuelPercent", fuelPercent);
            litersLeft = intent.getStringExtra("litersLeft") != null ? intent.getStringExtra("litersLeft") : litersLeft;
            emptyAt = intent.getStringExtra("emptyAt") != null ? intent.getStringExtra("emptyAt") : emptyAt;
            oilLeft = intent.getStringExtra("oilLeft") != null ? intent.getStringExtra("oilLeft") : oilLeft;
            String intentAccent = intent.getStringExtra("accentColor");
            if (intentAccent != null && !intentAccent.isEmpty()) {
                try { themeColor = android.graphics.Color.parseColor(intentAccent); } catch (Exception ignored) {}
            }
            opacity = intent.getIntExtra("opacity", opacity);
        }

        // ── Drawing the Speedometer (Matching App Style) ──────────────────────
        // Bitmap size: 540x300. Arc centered at bottom center of the drawable area.
        android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(540, 300, android.graphics.Bitmap.Config.ARGB_8888);
        android.graphics.Canvas canvas = new android.graphics.Canvas(bitmap);

        float cx = 270f;
        float cy = 220f; // Shifted UP to prevent overlap with bottom text data
        float radius = 180f;
        android.graphics.RectF rect = new android.graphics.RectF(cx - radius, cy - radius, cx + radius, cy + radius);

        int activeColor = speed > 80 ? android.graphics.Color.parseColor("#ff3366") : themeColor;

        // 1. Background Arc (Dim)
        android.graphics.Paint arcPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        arcPaint.setStyle(android.graphics.Paint.Style.STROKE);
        arcPaint.setStrokeWidth(12f);
        arcPaint.setStrokeCap(android.graphics.Paint.Cap.ROUND);
        arcPaint.setColor(android.graphics.Color.parseColor("#1AFFFFFF"));
        canvas.drawArc(rect, 180, 180, false, arcPaint);

        // 2. Speed Progress Arc (Neon)
        arcPaint.setColor(activeColor);
        arcPaint.setShadowLayer(15f, 0, 0, activeColor);
        float sweepAngle = (Math.min(speed, 120) / 120f) * 180f;
        canvas.drawArc(rect, 180, sweepAngle, false, arcPaint);
        arcPaint.clearShadowLayer();

        // 3. Ticks & Numbers (Replicating App logic)
        android.graphics.Paint tickPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        tickPaint.setColor(android.graphics.Color.parseColor("#80FFFFFF"));
        tickPaint.setStrokeWidth(2f);
        
        android.graphics.Paint labelPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        labelPaint.setColor(android.graphics.Color.parseColor("#99FFFFFF"));
        labelPaint.setTextSize(18f);
        labelPaint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        labelPaint.setTextAlign(android.graphics.Paint.Align.CENTER);

        int[] values = {0, 20, 40, 60, 80, 100, 120};
        for (int v : values) {
            float angle = (v / 120f) * 180f - 180f;
            double rad = Math.toRadians(angle);
            
            // Tick lines
            float x1 = cx + (radius - 15f) * (float)Math.cos(rad);
            float y1 = cy + (radius - 15f) * (float)Math.sin(rad);
            float x2 = cx + (radius + 5f) * (float)Math.cos(rad);
            float y2 = cy + (radius + 5f) * (float)Math.sin(rad);
            canvas.drawLine(x1, y1, x2, y2, tickPaint);
            
            // Labels
            float tx = cx + (radius + 30f) * (float)Math.cos(rad);
            float ty = cy + (radius + 30f) * (float)Math.sin(rad);
            // Adjust label Y slightly for bottom alignment
            canvas.drawText(String.valueOf(v), tx, ty + 6f, labelPaint);
        }

        // 4. Center Digital Speed
        android.graphics.Paint speedTextPaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        speedTextPaint.setColor(android.graphics.Color.WHITE);
        speedTextPaint.setTextSize(86f);
        speedTextPaint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        speedTextPaint.setTextAlign(android.graphics.Paint.Align.CENTER);
        speedTextPaint.setShadowLayer(10f, 0, 0, activeColor);
        canvas.drawText(String.valueOf(speed), cx, cy - 20f, speedTextPaint);
        
        speedTextPaint.clearShadowLayer();
        speedTextPaint.setTextSize(20f);
        speedTextPaint.setColor(android.graphics.Color.parseColor("#80FFFFFF"));
        speedTextPaint.setFakeBoldText(true);
        canvas.drawText("KM/H", cx, cy + 15f, speedTextPaint);

        // 5. Needle
        android.graphics.Paint needlePaint = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        needlePaint.setColor(activeColor);
        needlePaint.setStrokeWidth(6f);
        needlePaint.setStrokeCap(android.graphics.Paint.Cap.ROUND);
        needlePaint.setShadowLayer(5f, 0, 0, activeColor);
        
        double needleRad = Math.toRadians(180f + sweepAngle);
        float nx = cx + (radius - 10f) * (float)Math.cos(needleRad);
        float ny = cy + (radius - 10f) * (float)Math.sin(needleRad);
        canvas.drawLine(cx, cy - 10f, nx, ny, needlePaint);
        
        needlePaint.setStyle(android.graphics.Paint.Style.FILL);
        canvas.drawCircle(cx, cy - 10f, 8f, needlePaint);

        // Apply background opacity (0-255)
        int alpha = (int) (opacity * 2.55f);
        views.setInt(com.scooterfuel.tracker.R.id.widget_bg_image, "setImageAlpha", alpha);

        // Apply bitmap
        views.setImageViewBitmap(com.scooterfuel.tracker.R.id.widget_gauge_img, bitmap);

        // Update other views
        views.setTextViewText(com.scooterfuel.tracker.R.id.widget_range_text, range);
        views.setTextViewText(com.scooterfuel.tracker.R.id.widget_fuel_left_text, litersLeft);
        views.setTextViewText(com.scooterfuel.tracker.R.id.widget_empty_text, emptyAt);
        views.setTextViewText(com.scooterfuel.tracker.R.id.widget_oil_text, oilLeft);
        views.setInt(com.scooterfuel.tracker.R.id.widget_fuel_progress_fill, "setImageLevel", Math.min(fuelPercent * 100, 10000));
        views.setInt(com.scooterfuel.tracker.R.id.widget_fuel_progress_fill, "setColorFilter", activeColor);
        views.setInt(com.scooterfuel.tracker.R.id.widget_oil_dot, "setColorFilter", activeColor);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(android.content.Context context, android.appwidget.AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, null);
        }
    }

    @Override
    public void onReceive(android.content.Context context, android.content.Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_UPDATE_STATS.equals(intent.getAction())) {
            android.appwidget.AppWidgetManager appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context);
            android.content.ComponentName thisWidget = new android.content.ComponentName(context, SpeedometerWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId, intent);
            }
        }
    }
}
