package com.scooterfuel.tracker;

import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.text.Editable;
import android.text.InputType;
import android.text.TextWatcher;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.AlphaAnimation;
import android.view.animation.Animation;
import android.view.animation.AnimationSet;
import android.view.animation.DecelerateInterpolator;
import android.view.animation.ScaleAnimation;
import android.view.animation.TranslateAnimation;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

/**
 * Manages a floating system overlay for quick Add Fuel.
 */
public class FloatingAddFuelOverlay {

    private final Context context;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;
    private EditText litersInput;
    private EditText costInput;
    private boolean isFullTank = true;

    public FloatingAddFuelOverlay(Context context) {
        this.context = context.getApplicationContext();
    }

    public boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    public boolean isShowing() {
        return isShowing;
    }

    public void show() {
        if (isShowing || !canDrawOverlays()) return;

        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(() -> {
            try {
                createAndShowOverlay();
            } catch (Exception e) {
                android.util.Log.e("FloatingOdoOverlay", "Failed to show overlay", e);
            }
        });
    }

    public void dismiss() {
        if (!isShowing || overlayView == null) return;
        isShowing = false; // Prevent double dismiss

        Handler handler = new Handler(Looper.getMainLooper());
        handler.post(() -> {
            try {
                // Hide soft keyboard immediately before fading out
                if (litersInput != null) {
                    android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) context.getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.hideSoftInputFromWindow(litersInput.getWindowToken(), 0);
                    }
                }
                if (costInput != null) {
                    android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) context.getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (imm != null) {
                        imm.hideSoftInputFromWindow(costInput.getWindowToken(), 0);
                    }
                }

                // Dim background fade out
                overlayView.animate()
                    .alpha(0f)
                    .setDuration(150)
                    .withEndAction(this::removeOverlay)
                    .start();
                
                // Card slide/scale down
                if (overlayView instanceof FrameLayout) {
                    View card = ((FrameLayout) overlayView).getChildAt(0);
                    if (card != null) {
                        card.animate()
                            .alpha(0f)
                            .scaleX(0.8f)
                            .scaleY(0.8f)
                            .translationY(dp(50))
                            .setDuration(150)
                            .setInterpolator(new AccelerateDecelerateInterpolator())
                            .start();
                    }
                }
            } catch (Exception e) {
                removeOverlay();
            }
        });
    }

    private void removeOverlay() {
        try {
            if (windowManager != null && overlayView != null) {
                windowManager.removeView(overlayView);
            }
        } catch (Exception e) {
            // Already removed
        }
        overlayView = null;
        isShowing = false;
    }

    private void createAndShowOverlay() {
        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) return;

        SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        float currentOdo = prefs.getFloat("latest_odo_raw", 0.0f);
        String lang = prefs.getString("fuel_settings_language", "ar");
        boolean isAr = "ar".equals(lang);

        // ── Root container (full screen dimmed background) ──
        FrameLayout root = new FrameLayout(context);
        root.setBackgroundColor(Color.parseColor("#B3000000")); // 70% black dim
        root.setOnClickListener(v -> dismiss()); // Tap outside = close

        // ── Card container ──
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#0a0a0c")); // Deep black background
        cardBg.setCornerRadius(dp(20));
        cardBg.setStroke(dp(1), Color.parseColor("#2a2a2a")); // Subtle gray border
        card.setBackground(cardBg);

        int cardPadding = dp(24);
        card.setPadding(cardPadding, cardPadding, cardPadding, cardPadding);

        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
            dp(320), FrameLayout.LayoutParams.WRAP_CONTENT
        );
        cardLp.gravity = Gravity.CENTER;
        card.setLayoutParams(cardLp);
        card.setElevation(dp(24));
        card.setOnClickListener(v -> {}); // Prevent dismiss when tapping card

        // ── Header: Title + Close ──
        LinearLayout header = new LinearLayout(context);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        // Title
        TextView title = new TextView(context);
        title.setText(isAr ? "تفويل" : "REFUEL");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setLetterSpacing(0.1f);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
        );
        title.setLayoutParams(titleLp);

        // Close button (using image)
        android.widget.ImageView closeBtn = new android.widget.ImageView(context);
        try {
            java.io.InputStream is = context.getAssets().open("public/cancel.png");
            android.graphics.drawable.Drawable d = android.graphics.drawable.Drawable.createFromStream(is, null);
            closeBtn.setImageDrawable(d);
        } catch (java.io.IOException e) {
            // Fallback to text if image not found (shouldn't happen since Vite copied it)
        }
        closeBtn.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
        closeBtn.setPadding(dp(4), dp(4), dp(4), dp(4));
        LinearLayout.LayoutParams closeLp = new LinearLayout.LayoutParams(dp(40), dp(40));
        closeBtn.setLayoutParams(closeLp);
        closeBtn.setOnClickListener(v -> dismiss());

        header.addView(title);
        header.addView(closeBtn);
        card.addView(header);

        addSpacer(card, dp(22));

        // ── Input 1: ODO Reading ──
        LinearLayout inputGroup1 = new LinearLayout(context);
        inputGroup1.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable groupBg = new GradientDrawable();
        groupBg.setColor(Color.parseColor("#141417"));
        groupBg.setCornerRadius(dp(12));
        groupBg.setStroke(dp(2), Color.parseColor("#2a2a2a"));
        inputGroup1.setBackground(groupBg);
        inputGroup1.setPadding(dp(16), dp(12), dp(16), dp(12));

        TextView labelOdo = new TextView(context);
        labelOdo.setText(isAr ? "قراءة العداد" : "ODO READING");
        labelOdo.setTextColor(Color.parseColor("#888888"));
        labelOdo.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        labelOdo.setTypeface(Typeface.DEFAULT_BOLD);
        inputGroup1.addView(labelOdo);
        
        LinearLayout odoInputRow = new LinearLayout(context);
        odoInputRow.setOrientation(LinearLayout.HORIZONTAL);
        odoInputRow.setGravity(Gravity.CENTER_VERTICAL);
        
        EditText odoInput = new EditText(context);
        odoInput.setText(currentOdo > 0 ? String.format(java.util.Locale.US, "%.1f", currentOdo) : "");
        odoInput.setHint("0.0");
        odoInput.setHintTextColor(Color.parseColor("#444455"));
        odoInput.setTextColor(Color.WHITE);
        odoInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        odoInput.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        odoInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        odoInput.setBackground(null);
        odoInput.setPadding(0, dp(4), 0, 0);
        LinearLayout.LayoutParams odoLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        odoInput.setLayoutParams(odoLp);
        
        TextView kmLabel = new TextView(context);
        kmLabel.setText("KM");
        kmLabel.setTextColor(Color.parseColor("#888888"));
        kmLabel.setTypeface(Typeface.DEFAULT_BOLD);
        kmLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        
        odoInputRow.addView(odoInput);
        odoInputRow.addView(kmLabel);
        inputGroup1.addView(odoInputRow);
        card.addView(inputGroup1);

        addSpacer(card, dp(16));

        // ── Input 2: Fuel Cost ──
        LinearLayout inputGroup2 = new LinearLayout(context);
        inputGroup2.setOrientation(LinearLayout.VERTICAL);
        inputGroup2.setBackground(groupBg);
        inputGroup2.setPadding(dp(16), dp(12), dp(16), dp(12));

        TextView labelCost = new TextView(context);
        labelCost.setText(isAr ? "هتفوّل بكام؟" : "NEW FUEL COST");
        labelCost.setTextColor(Color.parseColor("#888888"));
        labelCost.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        labelCost.setTypeface(Typeface.DEFAULT_BOLD);
        inputGroup2.addView(labelCost);
        
        LinearLayout costInputRow = new LinearLayout(context);
        costInputRow.setOrientation(LinearLayout.HORIZONTAL);
        costInputRow.setGravity(Gravity.CENTER_VERTICAL);
        
        EditText fuelInput = new EditText(context);
        fuelInput.setHint("0.0");
        fuelInput.setHintTextColor(Color.parseColor("#444455"));
        fuelInput.setTextColor(Color.WHITE);
        fuelInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        fuelInput.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        fuelInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        fuelInput.setBackground(null);
        fuelInput.setPadding(0, dp(4), 0, 0);
        fuelInput.setLayoutParams(odoLp);
        
        TextView egpLabel = new TextView(context);
        egpLabel.setText("EGP");
        egpLabel.setTextColor(Color.WHITE);
        egpLabel.setBackgroundColor(Color.parseColor("#ff5e00")); // Accent secondary
        egpLabel.setPadding(dp(8), dp(4), dp(8), dp(4));
        egpLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        egpLabel.setTypeface(Typeface.DEFAULT_BOLD);
        GradientDrawable egpBg = new GradientDrawable();
        egpBg.setColor(Color.parseColor("#ff5e00"));
        egpBg.setCornerRadius(dp(8));
        egpLabel.setBackground(egpBg);
        
        costInputRow.addView(fuelInput);
        costInputRow.addView(egpLabel);
        inputGroup2.addView(costInputRow);
        card.addView(inputGroup2);
        
        addSpacer(card, dp(24));

        // ── SAVE Button ──
        FrameLayout saveBtnContainer = new FrameLayout(context);
        GradientDrawable saveBg = new GradientDrawable();
        saveBg.setColor(Color.TRANSPARENT);
        saveBg.setStroke(dp(2), Color.parseColor("#ff5e00")); // Accent border
        saveBg.setCornerRadius(dp(12));
        saveBtnContainer.setBackground(saveBg);
        
        TextView saveText = new TextView(context);
        saveText.setText(isAr ? "حفظ" : "SAVE");
        saveText.setTextColor(Color.parseColor("#ff5e00"));
        saveText.setTypeface(Typeface.DEFAULT_BOLD);
        saveText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        saveText.setLetterSpacing(0.1f);
        saveText.setGravity(Gravity.CENTER);
        
        FrameLayout.LayoutParams saveLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, dp(48)
        );
        saveBtnContainer.addView(saveText, saveLp);
        card.addView(saveBtnContainer);

        addSpacer(card, dp(12));

        // ── RESET TANK Button ──
        FrameLayout resetBtnContainer = new FrameLayout(context);
        GradientDrawable resetBg = new GradientDrawable();
        resetBg.setColor(Color.parseColor("#1aff3b30")); // 10% red
        resetBg.setStroke(dp(1), Color.parseColor("#33ff3b30")); // 20% red border
        resetBg.setCornerRadius(dp(10));
        resetBtnContainer.setBackground(resetBg);
        
        TextView resetText = new TextView(context);
        resetText.setText(isAr ? "تصفير التانك" : "RESET TANK");
        resetText.setTextColor(Color.parseColor("#ff3b30")); // Red
        resetText.setTypeface(Typeface.DEFAULT_BOLD);
        resetText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        resetText.setGravity(Gravity.CENTER);
        
        FrameLayout.LayoutParams resetLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT, dp(40)
        );
        resetLp.gravity = Gravity.CENTER;
        resetText.setPadding(dp(20), 0, dp(20), 0);
        resetBtnContainer.addView(resetText, resetLp);
        
        LinearLayout resetWrapper = new LinearLayout(context);
        resetWrapper.setGravity(Gravity.CENTER);
        resetWrapper.addView(resetBtnContainer);
        card.addView(resetWrapper);

        // ── Button Logic ──
        saveBtnContainer.setOnClickListener(v -> {
            String odoStr = odoInput.getText().toString();
            String fuelStr = fuelInput.getText().toString();
            if (odoStr.isEmpty() || fuelStr.isEmpty()) return;
            
            try {
                float newOdo = Float.parseFloat(odoStr);
                float addedEGP = Float.parseFloat(fuelStr);
                float pricePerL = prefs.getFloat("fuel_price_per_liter", 14.5f);
                float liters = addedEGP / pricePerL;
                
                long ts = System.currentTimeMillis();
                String logsJson = prefs.getString("fuel_logs", "[]");
                org.json.JSONArray logs = new org.json.JSONArray(logsJson);
                
                org.json.JSONObject newLog = new org.json.JSONObject();
                newLog.put("id", java.util.UUID.randomUUID().toString());
                newLog.put("timestamp", ts);
                newLog.put("liters", liters);
                newLog.put("cost", addedEGP);
                newLog.put("odo", newOdo);
                newLog.put("isFullTank", false); // Native quick sync defaults to partial
                
                logs.put(newLog);
                
                // We also need to update ODO stats (handled by JS usually, but we store ODO for widget)
                prefs.edit()
                     .putString("fuel_logs", logs.toString())
                     .putFloat("latest_odo_raw", newOdo)
                     .putString("latest_odo", String.format(java.util.Locale.US, "ODO: %.0f", newOdo))
                     .putFloat("fuel_warning_last_odo", 0.0f) // reset warning
                     .apply();
                
                // Vibrate
                Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                if (vib != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        vib.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE));
                    } else {
                        vib.vibrate(50);
                    }
                }
                
                dismiss();
                
                android.content.Intent updateIntent = new android.content.Intent(context, SpeedometerWidget.class);
                updateIntent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
                context.sendBroadcast(updateIntent);
            } catch (Exception e) {}
        });

        resetBtnContainer.setOnClickListener(v -> {
            // Just clear fuel tracking stats
            prefs.edit()
                 .putFloat("latest_fuelLiters_raw", 0.0f)
                 .putString("latest_litersLeft", "0.0 L")
                 .putInt("latest_fuelPercent", 0)
                 .putString("latest_range", "0.0 KM")
                 .apply();
                 
            dismiss();
            
            android.content.Intent updateIntent = new android.content.Intent(context, SpeedometerWidget.class);
            updateIntent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
            context.sendBroadcast(updateIntent);
        });

        // ── Add card to root ──
        root.addView(card);

        // ── Window params ──
        int overlayType;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            overlayType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
        } else {
            overlayType = WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            overlayType,
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Use software keyboard flags
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
                | WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        overlayView = root;
        
        // Hide navigation and status bar, extend into cutout areas
        // Extend into cutout areas but don't hide navigation bar to prevent flicker on exit
        overlayView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);

        windowManager.addView(overlayView, params);
        isShowing = true;

        // ── Entry animation ──
        AnimationSet inAnim = new AnimationSet(true);
        inAnim.setInterpolator(new DecelerateInterpolator(1.5f));
        inAnim.setDuration(300);

        AlphaAnimation fadeIn = new AlphaAnimation(0f, 1f);
        ScaleAnimation scaleIn = new ScaleAnimation(
            0.8f, 1f, 0.8f, 1f,
            Animation.RELATIVE_TO_SELF, 0.5f,
            Animation.RELATIVE_TO_SELF, 0.5f
        );
        TranslateAnimation slideUp = new TranslateAnimation(
            Animation.RELATIVE_TO_SELF, 0f,
            Animation.RELATIVE_TO_SELF, 0f,
            Animation.RELATIVE_TO_SELF, 0.05f,
            Animation.RELATIVE_TO_SELF, 0f
        );

        inAnim.addAnimation(fadeIn);
        inAnim.addAnimation(scaleIn);
        inAnim.addAnimation(slideUp);
        card.startAnimation(inAnim);

        // Focus input and show keyboard
        litersInput.requestFocus();
        litersInput.selectAll();
    }

    private void addSpacer(LinearLayout parent, int heightPx) {
        View spacer = new View(context);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, heightPx
        ));
        parent.addView(spacer);
    }

    private int dp(int dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp,
            context.getResources().getDisplayMetrics()
        );
    }
}
