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
                if (litersInput != null) litersInput.clearFocus();
                if (costInput != null) costInput.clearFocus();

                // Start animations immediately
                overlayView.animate()
                    .alpha(0f)
                    .setDuration(150)
                    .withEndAction(this::removeOverlay)
                    .start();
                
                // Card slide/scale down
                View card = ((android.view.ViewGroup) overlayView).getChildAt(0);
                if (card != null) {
                    card.animate()
                        .alpha(0f)
                        .scaleX(0.8f)
                        .scaleY(0.8f)
                        .translationY(dp(20))
                        .setDuration(150)
                        .setInterpolator(new AccelerateDecelerateInterpolator())
                        .start();
                }
            } catch (Exception e) {
                removeOverlay();
            }
        });
    }

    private void removeOverlay() {
        try {
            if (windowManager != null && overlayView != null) {
                windowManager.removeViewImmediate(overlayView);
            }
        } catch (Exception e) {
            // Already removed
        }
        overlayView = null;
        isShowing = false;
    }

    private EditText fuelInput;
    private TextView convertedLabel;
    private TextView totalAfterLabel;
    private boolean isEgpMode = true;
    private float tankHasEgp = 0f;
    private float tankHasLiters = 0f;
    private float pricePerL = 14.5f;

    private void updateCalculations() {
        if (fuelInput == null || convertedLabel == null || totalAfterLabel == null) return;
        String valStr = fuelInput.getText().toString();
        float val = 0f;
        try {
            val = Float.parseFloat(valStr);
        } catch (Exception ignored) {}

        float addedL = isEgpMode ? (val / pricePerL) : val;
        float addedEGP = isEgpMode ? val : (val * pricePerL);
        
        float totalEGP = tankHasEgp + addedEGP;
        float totalL = tankHasLiters + addedL;

        if (isEgpMode) {
            convertedLabel.setText(String.format(java.util.Locale.US, "= %.2f L", addedL));
        } else {
            convertedLabel.setText(String.format(java.util.Locale.US, "= %.1f EGP", addedEGP));
        }
        totalAfterLabel.setText(String.format(java.util.Locale.US, "Total After: %.1f EGP | %.2f L", totalEGP, totalL));
    }

    private void createAndShowOverlay() {
        windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);
        if (windowManager == null) return;

        SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        float currentOdo = prefs.getFloat("latest_odo_raw", 0.0f);
        String lang = prefs.getString("setting_language", "en"); // Default to EN, as capacitor failed to sync AR
        boolean isAr = "ar".equals(lang);

        pricePerL = prefs.getFloat("fuel_price_per_liter", 14.5f);
        tankHasLiters = prefs.getFloat("latest_fuelLiters_raw", 0.0f);
        tankHasEgp = tankHasLiters * pricePerL;

        // ── Root container (full screen dimmed background) ──
        FrameLayout root = new FrameLayout(context);
        root.setBackgroundColor(Color.parseColor("#B3000000")); // 70% black dim
        root.setOnClickListener(v -> dismiss()); // Tap outside = close

        // ── Card container ──
        LinearLayout card = new LinearLayout(context);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setLayoutDirection(View.LAYOUT_DIRECTION_LTR);

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#0a0a0c")); // Deep black background
        cardBg.setCornerRadius(dp(20));
        cardBg.setStroke(dp(1), Color.parseColor("#2a2a2a")); // Subtle gray border
        card.setBackground(cardBg);

        int cardPadding = dp(24);
        card.setPadding(cardPadding, dp(32), cardPadding, dp(32));

        FrameLayout.LayoutParams cardLp = new FrameLayout.LayoutParams(
            dp(340), FrameLayout.LayoutParams.WRAP_CONTENT
        );
        cardLp.gravity = Gravity.CENTER;
        card.setLayoutParams(cardLp);
        card.setElevation(dp(24));
        card.setOnClickListener(v -> {}); // Prevent dismiss when tapping card

        // ── Header: Title + Close ──
        LinearLayout header = new LinearLayout(context);
        header.setOrientation(LinearLayout.HORIZONTAL);
        header.setGravity(Gravity.CENTER_VERTICAL);

        // Arrow icon
        android.widget.ImageView arrowIcon = new android.widget.ImageView(context);
        try {
            java.io.InputStream is = context.getAssets().open("public/title-tag.png");
            android.graphics.drawable.Drawable d = android.graphics.drawable.Drawable.createFromStream(is, null);
            arrowIcon.setImageDrawable(d);
        } catch (java.io.IOException ignored) {}
        arrowIcon.setLayoutParams(new LinearLayout.LayoutParams(dp(24), dp(24)));
        arrowIcon.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
        header.addView(arrowIcon);
        
        addSpacerW(header, dp(10));

        // Title
        TextView title = new TextView(context);
        title.setText(isAr ? "تفويل" : "ADD FUEL");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        title.setTypeface(Typeface.create("sans-serif", Typeface.BOLD));
        title.setLetterSpacing(0.05f);
        LinearLayout.LayoutParams titleLp = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
        );
        title.setLayoutParams(titleLp);
        header.addView(title);

        // Close button (using image)
        android.widget.ImageView closeBtn = new android.widget.ImageView(context);
        try {
            java.io.InputStream is = context.getAssets().open("public/cancel.png");
            android.graphics.drawable.Drawable d = android.graphics.drawable.Drawable.createFromStream(is, null);
            closeBtn.setImageDrawable(d);
        } catch (java.io.IOException ignored) {}
        closeBtn.setScaleType(android.widget.ImageView.ScaleType.CENTER_INSIDE);
        LinearLayout.LayoutParams closeLp = new LinearLayout.LayoutParams(dp(36), dp(36));
        closeBtn.setLayoutParams(closeLp);
        closeBtn.setOnClickListener(v -> dismiss());
        header.addView(closeBtn);
        
        card.addView(header);

        addSpacer(card, dp(24));

        // ── Input 1: ODO Reading ──
        LinearLayout inputGroup1 = new LinearLayout(context);
        inputGroup1.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable groupBg = new GradientDrawable();
        groupBg.setColor(Color.parseColor("#111115"));
        groupBg.setCornerRadius(dp(16));
        groupBg.setStroke(dp(2), Color.parseColor("#2a2a2a"));
        inputGroup1.setBackground(groupBg);
        inputGroup1.setPadding(dp(16), dp(16), dp(16), dp(16));

        TextView labelOdo = new TextView(context);
        labelOdo.setText(isAr ? "قراءة العداد الحالية" : "CURRENT ODO READING");
        labelOdo.setTextColor(Color.parseColor("#888888"));
        labelOdo.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
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
        odoInput.setPadding(0, dp(4), 0, dp(4));
        LinearLayout.LayoutParams odoLp = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        odoInput.setLayoutParams(odoLp);
        
        TextView kmLabel = new TextView(context);
        kmLabel.setText("KM");
        kmLabel.setTextColor(Color.parseColor("#888888"));
        kmLabel.setTypeface(Typeface.DEFAULT_BOLD);
        kmLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        
        odoInputRow.addView(odoInput);
        odoInputRow.addView(kmLabel);
        inputGroup1.addView(odoInputRow);
        card.addView(inputGroup1);

        addSpacer(card, dp(16));

        // ── Input 2: Fuel Cost Complex Box ──
        LinearLayout inputGroup2 = new LinearLayout(context);
        inputGroup2.setOrientation(LinearLayout.VERTICAL);
        inputGroup2.setBackground(groupBg);
        inputGroup2.setPadding(dp(16), dp(16), dp(16), dp(16));

        // Row 1: Labels
        LinearLayout labelRow = new LinearLayout(context);
        labelRow.setOrientation(LinearLayout.HORIZONTAL);
        TextView labelCost = new TextView(context);
        labelCost.setText(isAr ? "التكلفة الجديدة" : "NEW FUEL COST");
        labelCost.setTextColor(Color.parseColor("#888888"));
        labelCost.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        labelCost.setTypeface(Typeface.DEFAULT_BOLD);
        labelRow.addView(labelCost, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        
        TextView tankHasLabel = new TextView(context);
        tankHasLabel.setText(String.format(java.util.Locale.US, "TANK HAS: %.1f EGP", tankHasEgp));
        tankHasLabel.setTextColor(Color.parseColor("#666666"));
        tankHasLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 10);
        tankHasLabel.setTypeface(Typeface.DEFAULT_BOLD);
        labelRow.addView(tankHasLabel);
        inputGroup2.addView(labelRow);
        
        addSpacer(inputGroup2, dp(8));
        
        // Row 2: Input + Switch
        LinearLayout costInputRow = new LinearLayout(context);
        costInputRow.setOrientation(LinearLayout.HORIZONTAL);
        costInputRow.setGravity(Gravity.CENTER_VERTICAL);
        
        fuelInput = new EditText(context);
        fuelInput.setHint("0.0");
        fuelInput.setHintTextColor(Color.parseColor("#444455"));
        fuelInput.setTextColor(Color.WHITE);
        fuelInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 22);
        fuelInput.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        fuelInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        fuelInput.setBackground(null);
        fuelInput.setPadding(0, dp(4), 0, dp(4));
        costInputRow.addView(fuelInput, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
        
        // Switch Container
        LinearLayout switchContainer = new LinearLayout(context);
        switchContainer.setOrientation(LinearLayout.HORIZONTAL);
        GradientDrawable switchBg = new GradientDrawable();
        switchBg.setColor(Color.parseColor("#222226"));
        switchBg.setCornerRadius(dp(12));
        switchBg.setStroke(dp(1), Color.parseColor("#333333"));
        switchContainer.setBackground(switchBg);
        switchContainer.setPadding(dp(4), dp(4), dp(4), dp(4));
        
        TextView egpBtn = new TextView(context);
        egpBtn.setText("EGP");
        egpBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        egpBtn.setTypeface(Typeface.DEFAULT_BOLD);
        egpBtn.setPadding(dp(12), dp(6), dp(12), dp(6));
        GradientDrawable activeBg = new GradientDrawable();
        activeBg.setColor(Color.parseColor("#ff5e00"));
        activeBg.setCornerRadius(dp(8));
        egpBtn.setBackground(activeBg);
        egpBtn.setTextColor(Color.WHITE);
        
        TextView lBtn = new TextView(context);
        lBtn.setText("Liters");
        lBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        lBtn.setTypeface(Typeface.DEFAULT_BOLD);
        lBtn.setPadding(dp(12), dp(6), dp(12), dp(6));
        lBtn.setBackgroundColor(Color.TRANSPARENT);
        lBtn.setTextColor(Color.parseColor("#888888"));
        
        switchContainer.addView(egpBtn);
        switchContainer.addView(lBtn);
        costInputRow.addView(switchContainer);
        inputGroup2.addView(costInputRow);
        
        // Divider
        View div = new View(context);
        div.setBackgroundColor(Color.parseColor("#2a2a2a"));
        LinearLayout.LayoutParams divLp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(1));
        divLp.setMargins(0, dp(16), 0, dp(16));
        div.setLayoutParams(divLp);
        inputGroup2.addView(div);
        
        // Conversions
        convertedLabel = new TextView(context);
        convertedLabel.setText("= 0.00 L");
        convertedLabel.setTextColor(Color.parseColor("#888888"));
        convertedLabel.setTypeface(Typeface.DEFAULT_BOLD);
        convertedLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        convertedLabel.setGravity(Gravity.CENTER);
        inputGroup2.addView(convertedLabel);
        
        addSpacer(inputGroup2, dp(6));
        
        totalAfterLabel = new TextView(context);
        totalAfterLabel.setText(String.format(java.util.Locale.US, "Total After: %.1f EGP | %.2f L", tankHasEgp, tankHasLiters));
        totalAfterLabel.setTextColor(Color.parseColor("#4ade80")); // Green
        totalAfterLabel.setTypeface(Typeface.DEFAULT_BOLD);
        totalAfterLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        totalAfterLabel.setGravity(Gravity.CENTER);
        inputGroup2.addView(totalAfterLabel);
        
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
        saveText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        saveText.setLetterSpacing(0.1f);
        saveText.setGravity(Gravity.CENTER);
        
        FrameLayout.LayoutParams saveLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT, dp(54)
        );
        saveBtnContainer.addView(saveText, saveLp);
        card.addView(saveBtnContainer);

        addSpacer(card, dp(16));

        // ── RESET TANK Button ──
        FrameLayout resetBtnContainer = new FrameLayout(context);
        GradientDrawable resetBg = new GradientDrawable();
        resetBg.setColor(Color.parseColor("#1aff3b30")); // 10% red
        resetBg.setStroke(dp(1), Color.parseColor("#33ff3b30")); // 20% red border
        resetBg.setCornerRadius(dp(10));
        resetBtnContainer.setBackground(resetBg);
        
        TextView resetText = new TextView(context);
        resetText.setText(isAr ? "تصفير التانك" : "Reset Tank");
        resetText.setTextColor(Color.parseColor("#ff3b30")); // Red
        resetText.setTypeface(Typeface.DEFAULT_BOLD);
        resetText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
        resetText.setGravity(Gravity.CENTER);
        
        FrameLayout.LayoutParams resetLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT, dp(44)
        );
        resetLp.gravity = Gravity.CENTER;
        resetText.setPadding(dp(24), 0, dp(24), 0);
        resetBtnContainer.addView(resetText, resetLp);
        
        LinearLayout resetWrapper = new LinearLayout(context);
        resetWrapper.setGravity(Gravity.CENTER);
        resetWrapper.addView(resetBtnContainer);
        card.addView(resetWrapper);

        // ── Logic ──
        egpBtn.setOnClickListener(v -> {
            isEgpMode = true;
            egpBtn.setBackground(activeBg);
            egpBtn.setTextColor(Color.WHITE);
            lBtn.setBackgroundColor(Color.TRANSPARENT);
            lBtn.setTextColor(Color.parseColor("#888888"));
            labelCost.setText(isAr ? "هتفوّل بكام؟" : "NEW FUEL COST");
            updateCalculations();
        });
        
        lBtn.setOnClickListener(v -> {
            isEgpMode = false;
            lBtn.setBackground(activeBg);
            lBtn.setTextColor(Color.WHITE);
            egpBtn.setBackgroundColor(Color.TRANSPARENT);
            egpBtn.setTextColor(Color.parseColor("#888888"));
            labelCost.setText(isAr ? "هتفوّل كام لتر؟" : "NEW FUEL LITERS");
            updateCalculations();
        });
        
        fuelInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override public void afterTextChanged(Editable s) {
                updateCalculations();
            }
        });

        saveBtnContainer.setOnClickListener(v -> {
            String odoStr = odoInput.getText().toString();
            String fuelStr = fuelInput.getText().toString();
            if (odoStr.isEmpty()) return;
            
            try {
                float newOdo = Float.parseFloat(odoStr);
                
                SharedPreferences.Editor editor = prefs.edit();

                if (!fuelStr.isEmpty()) {
                    float val = Float.parseFloat(fuelStr);
                    float addedEGP = isEgpMode ? val : (val * pricePerL);
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
                    
                    editor.putString("fuel_logs", logs.toString())
                          .putFloat("latest_fuelLiters_raw", tankHasLiters + liters)
                          .putString("latest_litersLeft", String.format(java.util.Locale.US, "%.1f L", tankHasLiters + liters))
                          .putFloat("fuel_warning_last_odo", 0.0f); // reset warning
                }

                // Update ODO stats and JS sync flags universally
                editor.putFloat("latest_odo_raw", newOdo)
                      .putString("latest_odo", String.format(java.util.Locale.US, "ODO: %.0f", newOdo))
                      .putBoolean("overlay_sync_pending", true)
                      .putFloat("overlay_sync_odo", newOdo)
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
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Use software keyboard flags
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            params.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        overlayView = root;

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

    private void addSpacer(LinearLayout layout, int height) {
        View spacer = new View(context);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, height));
        layout.addView(spacer);
    }

    private void addSpacerW(LinearLayout layout, int width) {
        View spacer = new View(context);
        spacer.setLayoutParams(new LinearLayout.LayoutParams(width, LinearLayout.LayoutParams.MATCH_PARENT));
        layout.addView(spacer);
    }

    private int dp(int dp) {
        return (int) TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP, dp,
            context.getResources().getDisplayMetrics()
        );
    }
}
