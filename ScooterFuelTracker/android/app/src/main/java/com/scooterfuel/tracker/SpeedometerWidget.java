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

    static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId, Intent intent) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_speedometer);

        // Click on widget -> Open App
        Intent mainIntent = new Intent(context, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, mainIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.top_row, pendingIntent);

        // Default values from SharedPreferences (Cached Stats)
        android.content.SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        
        int speed = 0;
        String range = prefs.getString("latest_range", "-- KM");
        int fuelPercent = prefs.getInt("latest_fuelPercent", 0);
        String litersLeft = prefs.getString("latest_litersLeft", "-- L");
        String emptyAt = prefs.getString("latest_emptyAt", "EMPTY: --");
        String oilLeft = prefs.getString("latest_oilLeft", "OIL: -- KM");
        String accentColorStr = prefs.getString("latest_accentColor", "#00f0ff");
        int opacity = prefs.getInt("latest_opacity", 100);
        int themeColor = Color.parseColor("#00f0ff");
        try { themeColor = Color.parseColor(accentColorStr); } catch (Exception ignored) {}

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
                try { themeColor = Color.parseColor(intentAccent); } catch (Exception ignored) {}
            }
            opacity = intent.getIntExtra("opacity", opacity);
        }

        // ── Drawing the Speedometer (Matching App Style) ──────────────────────
        // Bitmap size: 540x300. Arc centered at bottom center of the drawable area.
        Bitmap bitmap = Bitmap.createBitmap(540, 300, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        float cx = 270f;
        float cy = 220f; // Shifted UP to prevent overlap with bottom text data
        float radius = 180f;
        RectF rect = new RectF(cx - radius, cy - radius, cx + radius, cy + radius);

        int activeColor = speed > 80 ? Color.parseColor("#ff3366") : themeColor;

        // 1. Background Arc (Dim)
        Paint arcPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        arcPaint.setStyle(Paint.Style.STROKE);
        arcPaint.setStrokeWidth(12f);
        arcPaint.setStrokeCap(Paint.Cap.ROUND);
        arcPaint.setColor(Color.parseColor("#1AFFFFFF"));
        canvas.drawArc(rect, 180, 180, false, arcPaint);

        // 2. Speed Progress Arc (Neon)
        arcPaint.setColor(activeColor);
        arcPaint.setShadowLayer(15f, 0, 0, activeColor);
        float sweepAngle = (Math.min(speed, 120) / 120f) * 180f;
        canvas.drawArc(rect, 180, sweepAngle, false, arcPaint);
        arcPaint.clearShadowLayer();

        // 3. Ticks & Numbers (Replicating App logic)
        Paint tickPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        tickPaint.setColor(Color.parseColor("#80FFFFFF"));
        tickPaint.setStrokeWidth(2f);
        
        Paint labelPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        labelPaint.setColor(Color.parseColor("#99FFFFFF"));
        labelPaint.setTextSize(18f);
        labelPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        labelPaint.setTextAlign(Paint.Align.CENTER);

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
        Paint speedTextPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        speedTextPaint.setColor(Color.WHITE);
        speedTextPaint.setTextSize(86f);
        speedTextPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        speedTextPaint.setTextAlign(Paint.Align.CENTER);
        speedTextPaint.setShadowLayer(10f, 0, 0, activeColor);
        canvas.drawText(String.valueOf(speed), cx, cy - 20f, speedTextPaint);
        
        speedTextPaint.clearShadowLayer();
        speedTextPaint.setTextSize(20f);
        speedTextPaint.setColor(Color.parseColor("#80FFFFFF"));
        speedTextPaint.setFakeBoldText(true);
        canvas.drawText("KM/H", cx, cy + 15f, speedTextPaint);

        // 5. Needle
        Paint needlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        needlePaint.setColor(activeColor);
        needlePaint.setStrokeWidth(6f);
        needlePaint.setStrokeCap(Paint.Cap.ROUND);
        needlePaint.setShadowLayer(5f, 0, 0, activeColor);
        
        double needleRad = Math.toRadians(180f + sweepAngle);
        float nx = cx + (radius - 10f) * (float)Math.cos(needleRad);
        float ny = cy + (radius - 10f) * (float)Math.sin(needleRad);
        canvas.drawLine(cx, cy - 10f, nx, ny, needlePaint);
        
        needlePaint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(cx, cy - 10f, 8f, needlePaint);

        // Apply background opacity (0-255)
        int alpha = (int) (opacity * 2.55f);
        views.setInt(R.id.widget_bg_image, "setImageAlpha", alpha);

        // Apply bitmap
        views.setImageViewBitmap(R.id.widget_gauge_img, bitmap);

        // Update other views
        views.setTextViewText(R.id.widget_range_text, range);
        views.setTextViewText(R.id.widget_fuel_left_text, litersLeft);
        views.setTextViewText(R.id.widget_empty_text, emptyAt);
        views.setTextViewText(R.id.widget_oil_text, oilLeft);
        views.setInt(R.id.widget_fuel_progress_fill, "setImageLevel", Math.min(fuelPercent * 100, 10000));
        views.setInt(R.id.widget_fuel_progress_fill, "setColorFilter", activeColor);
        views.setInt(R.id.widget_oil_dot, "setColorFilter", activeColor);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId, null);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_UPDATE_STATS.equals(intent.getAction())) {
            AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, SpeedometerWidget.class);
            int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
            for (int appWidgetId : appWidgetIds) {
                updateAppWidget(context, appWidgetManager, appWidgetId, intent);
            }
        }
    }
}
