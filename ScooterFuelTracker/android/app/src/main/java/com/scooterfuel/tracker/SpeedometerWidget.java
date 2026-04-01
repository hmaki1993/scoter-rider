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
        PendingIntent pendingIntent = PendingIntent.getActivity(context, 0, mainIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.top_row, pendingIntent);
        
        // If we received live stats from our Background Service
        if (intent != null && ACTION_UPDATE_STATS.equals(intent.getAction())) {
            int speed = intent.getIntExtra("speed", 0);
            String range = intent.getStringExtra("range") != null ? intent.getStringExtra("range") : "0.0 KM";
            int fuelPercent = intent.getIntExtra("fuelPercent", 0);
            String litersLeft = intent.getStringExtra("litersLeft") != null ? intent.getStringExtra("litersLeft") : "0.0 L";
            String emptyAt = intent.getStringExtra("emptyAt") != null ? intent.getStringExtra("emptyAt") : "EMPTY: 0.0 KM";
            String oilLeft = intent.getStringExtra("oilLeft") != null ? intent.getStringExtra("oilLeft") : "OIL: 0 KM";
            boolean isDanger = intent.getBooleanExtra("isDanger", false);
            boolean isWarning = intent.getBooleanExtra("isWarning", false);
            String accentColorStr = intent.getStringExtra("accentColor");
            
            int themeColor = Color.parseColor("#00f0ff");
            if (accentColorStr != null && !accentColorStr.isEmpty()) {
                try {
                    themeColor = Color.parseColor(accentColorStr);
                } catch (Exception e) {}
            }

            // ── Draw Native Neon Canvas Speedometer ──
            Bitmap bitmap = Bitmap.createBitmap(540, 360, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            Paint bgPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            bgPaint.setStyle(Paint.Style.STROKE);
            bgPaint.setStrokeWidth(24f);
            bgPaint.setStrokeCap(Paint.Cap.ROUND);
            bgPaint.setColor(Color.parseColor("#1AFFFFFF"));

            RectF rect = new RectF(50, 50, 490, 490);
            
            // Draw background track
            canvas.drawArc(rect, 180, 180, false, bgPaint);

            // Draw foreground track
            int activeColor = speed > 80 ? Color.parseColor("#ff3366") : themeColor;
            Paint fgPaint = new Paint(bgPaint);
            fgPaint.setColor(activeColor);
            
            float progressAngle = (Math.min(speed, 120) / 120f) * 180f;
            canvas.drawArc(rect, 180, progressAngle, false, fgPaint);

            // Draw texts (Center Speed)
            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            textPaint.setColor(Color.WHITE);
            textPaint.setTextSize(100f);
            textPaint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
            textPaint.setTextAlign(Paint.Align.CENTER);
            
            // Small shadow effect
            textPaint.setShadowLayer(8f, 0, 0, Color.parseColor("#4D00F0FF"));
            canvas.drawText(String.valueOf(speed), 270, 210, textPaint);

            // KM/H subtle text
            textPaint.clearShadowLayer();
            textPaint.setTextSize(26f);
            textPaint.setColor(Color.parseColor("#80FFFFFF"));
            canvas.drawText("KM/H", 270, 260, textPaint);

            // Draw Needle
            Paint needlePaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            needlePaint.setColor(activeColor);
            needlePaint.setStrokeWidth(10f);
            needlePaint.setStrokeCap(Paint.Cap.ROUND);
            
            double angleRad = Math.toRadians(180 + progressAngle);
            float endX = (float) (270 + 200 * Math.cos(angleRad));
            float endY = (float) (270 + 200 * Math.sin(angleRad));
            
            // Draw needle line and pivot circle
            canvas.drawLine(270, 270, endX, endY, needlePaint);
            needlePaint.setStyle(Paint.Style.FILL);
            canvas.drawCircle(270, 270, 14f, needlePaint);

            // Apply bitmap
            views.setImageViewBitmap(R.id.widget_gauge_img, bitmap);

        }

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
