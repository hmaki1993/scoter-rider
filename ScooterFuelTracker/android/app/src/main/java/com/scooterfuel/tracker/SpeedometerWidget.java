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

        // Default values (shown before app connects)
        int speed = 0;
        String range = "-- KM";
        int fuelPercent = 0;
        String litersLeft = "-- L";
        String emptyAt = "EMPTY: --";
        String oilLeft = "OIL: -- KM";
        int themeColor = Color.parseColor("#00f0ff");

        if (intent != null && ACTION_UPDATE_STATS.equals(intent.getAction())) {
            speed = intent.getIntExtra("speed", 0);
            range = intent.getStringExtra("range") != null ? intent.getStringExtra("range") : "0.0 KM";
            fuelPercent = intent.getIntExtra("fuelPercent", 0);
            litersLeft = intent.getStringExtra("litersLeft") != null ? intent.getStringExtra("litersLeft") : "0.0 L";
            emptyAt = intent.getStringExtra("emptyAt") != null ? intent.getStringExtra("emptyAt") : "EMPTY: 0.0 KM";
            oilLeft = intent.getStringExtra("oilLeft") != null ? intent.getStringExtra("oilLeft") : "OIL: 0 KM";
            String accentColorStr = intent.getStringExtra("accentColor");
            if (accentColorStr != null && !accentColorStr.isEmpty()) {
                try { themeColor = Color.parseColor(accentColorStr); } catch (Exception ignored) {}
            }
        }

        // ── Build Canvas Speedometer Bitmap ──────────────────────────────────
        // 540×300px bitmap: top half is the gauge arc, bottom area is the speed number
        Bitmap bitmap = Bitmap.createBitmap(540, 300, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        // Arc geometry: center at (270, 10), radius 230 → draws a half-circle
        float arcCx = 270f;
        float arcCy = 10f;
        float radius = 230f;
        RectF rect = new RectF(arcCx - radius, arcCy - radius, arcCx + radius, arcCy + radius);

        // 1. Background track (dim white)
        Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        bgPaint.setStyle(Paint.Style.STROKE);
        bgPaint.setStrokeWidth(22f);
        bgPaint.setStrokeCap(Paint.Cap.ROUND);
        bgPaint.setColor(Color.parseColor("#22FFFFFF"));
        canvas.drawArc(rect, 180, 180, false, bgPaint);

        // 2. Foreground neon arc (speed progress)
        int activeColor = speed > 80 ? Color.parseColor("#ff3366") : themeColor;
        Paint fgPaint = new Paint(bgPaint);
        fgPaint.setColor(activeColor);
        float progressAngle = (Math.min(speed, 120) / 120f) * 180f;
        canvas.drawArc(rect, 180, progressAngle, false, fgPaint);

        // 3. Needle
        Paint needlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        needlePaint.setColor(activeColor);
        needlePaint.setStrokeWidth(8f);
        needlePaint.setStrokeCap(Paint.Cap.ROUND);
        double needleRad = Math.toRadians(180 + progressAngle);
        float needleLen = radius - 20f;
        float needleX = arcCx + (float)(needleLen * Math.cos(needleRad));
        float needleY = arcCy + (float)(needleLen * Math.sin(needleRad));
        canvas.drawLine(arcCx, arcCy, needleX, needleY, needlePaint);
        needlePaint.setStyle(Paint.Style.FILL);
        canvas.drawCircle(arcCx, arcCy, 10f, needlePaint);

        // 4. Speed number & KM/H label (drawn in lower center)
        Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
        textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        textPaint.setTextAlign(Paint.Align.CENTER);
        textPaint.setColor(Color.WHITE);
        textPaint.setTextSize(96f);
        textPaint.setShadowLayer(8f, 0, 0, 0x4400F0FF);
        canvas.drawText(String.valueOf(speed), arcCx, 210f, textPaint);
        textPaint.clearShadowLayer();
        textPaint.setTextSize(22f);
        textPaint.setColor(Color.parseColor("#80FFFFFF"));
        canvas.drawText("KM/H", arcCx, 246f, textPaint);

        // Apply bitmap to ImageView
        views.setImageViewBitmap(R.id.widget_gauge_img, bitmap);

        // ── Update all text & info views ─────────────────────────────────────
        views.setTextViewText(R.id.widget_range_text, range);
        views.setTextViewText(R.id.widget_fuel_left_text, litersLeft);
        views.setTextViewText(R.id.widget_empty_text, emptyAt);
        views.setTextViewText(R.id.widget_oil_text, oilLeft);

        // Fuel bar fill level (0-10000 range for ImageView level)
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
