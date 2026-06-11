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
 * Manages a floating system overlay for quick ODO sync.
 * Shows a card with an input field and save button on top of everything.
 * Requires SYSTEM_ALERT_WINDOW permission.
 */
public class FloatingOdoOverlay {

    private final Context context;
    private WindowManager windowManager;
    private View overlayView;
    private boolean isShowing = false;

    public FloatingOdoOverlay(Context context) {
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
            dp(300), FrameLayout.LayoutParams.WRAP_CONTENT
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
        title.setText("🔄 SYNC ODO");
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
        closeBtn.setPadding(dp(8), dp(8), dp(8), dp(8));
        LinearLayout.LayoutParams closeLp = new LinearLayout.LayoutParams(dp(44), dp(44));
        closeBtn.setLayoutParams(closeLp);
        closeBtn.setOnClickListener(v -> dismiss());

        header.addView(title);
        header.addView(closeBtn);
        card.addView(header);

        // ── Spacer ──
        addSpacer(card, dp(16));

        // ── Label ──
        TextView label = new TextView(context);
        label.setText("CURRENT ODO READING");
        label.setTextColor(Color.parseColor("#888888"));
        label.setTextSize(TypedValue.COMPLEX_UNIT_SP, 11);
        label.setTypeface(Typeface.DEFAULT_BOLD);
        label.setLetterSpacing(0.08f);
        card.addView(label);

        addSpacer(card, dp(8));

        // ── Input container ──
        LinearLayout inputContainer = new LinearLayout(context);
        inputContainer.setOrientation(LinearLayout.HORIZONTAL);
        inputContainer.setGravity(Gravity.CENTER_VERTICAL);

        GradientDrawable inputBg = new GradientDrawable();
        inputBg.setColor(Color.parseColor("#111111"));
        inputBg.setCornerRadius(dp(14));
        inputBg.setStroke(dp(1), Color.parseColor("#333333"));
        inputContainer.setBackground(inputBg);
        inputContainer.setPadding(dp(16), dp(4), dp(16), dp(4));

        // EditText
        EditText odoInput = new EditText(context);
        odoInput.setText(currentOdo > 0 ? String.format("%.1f", currentOdo) : "");
        odoInput.setHint("0.0");
        odoInput.setHintTextColor(Color.parseColor("#444455"));
        odoInput.setTextColor(Color.WHITE);
        odoInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
        odoInput.setTypeface(Typeface.create("sans-serif-medium", Typeface.BOLD));
        odoInput.setInputType(InputType.TYPE_CLASS_NUMBER | InputType.TYPE_NUMBER_FLAG_DECIMAL);
        odoInput.setBackground(null);
        odoInput.setGravity(Gravity.CENTER);
        odoInput.setLetterSpacing(0.05f);
        odoInput.setPadding(0, dp(8), 0, dp(8));

        LinearLayout.LayoutParams inputLp = new LinearLayout.LayoutParams(
            0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
        );
        odoInput.setLayoutParams(inputLp);

        // KM suffix
        TextView kmLabel = new TextView(context);
        kmLabel.setText("KM");
        kmLabel.setTextColor(Color.parseColor("#8888AA"));
        kmLabel.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        kmLabel.setTypeface(Typeface.DEFAULT_BOLD);
        kmLabel.setLetterSpacing(0.1f);

        inputContainer.addView(odoInput);
        inputContainer.addView(kmLabel);
        card.addView(inputContainer);

        addSpacer(card, dp(8));

        // ── Diff badge (shows +X.X KM when value > current) ──
        TextView diffBadge = new TextView(context);
        diffBadge.setTextColor(Color.parseColor("#FFFFFF"));
        diffBadge.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        diffBadge.setTypeface(Typeface.DEFAULT_BOLD);
        diffBadge.setGravity(Gravity.CENTER);
        diffBadge.setVisibility(View.GONE);
        card.addView(diffBadge);

        // Update diff badge on text change
        final float finalCurrentOdo = currentOdo;
        odoInput.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int start, int count, int after) {}
            @Override public void onTextChanged(CharSequence s, int start, int before, int count) {}
            @Override
            public void afterTextChanged(Editable s) {
                try {
                    float newVal = Float.parseFloat(s.toString());
                    if (newVal > finalCurrentOdo && finalCurrentOdo > 0) {
                        float diff = newVal - finalCurrentOdo;
                        diffBadge.setText(String.format("+%.1f KM", diff));
                        diffBadge.setVisibility(View.VISIBLE);
                    } else {
                        diffBadge.setVisibility(View.GONE);
                    }
                } catch (NumberFormatException e) {
                    diffBadge.setVisibility(View.GONE);
                }
            }
        });

        addSpacer(card, dp(6));

        // ── Helper text ──
        TextView helper = new TextView(context);
        helper.setText("Match your scooter's odometer screen");
        helper.setTextColor(Color.parseColor("#666666"));
        helper.setTextSize(TypedValue.COMPLEX_UNIT_SP, 12);
        helper.setGravity(Gravity.CENTER);
        card.addView(helper);

        addSpacer(card, dp(20));

        // ── Save Button ──
        Button saveBtn = new Button(context);
        saveBtn.setText("SAVE");
        saveBtn.setTextColor(Color.BLACK);
        saveBtn.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        saveBtn.setTypeface(Typeface.DEFAULT_BOLD);
        saveBtn.setLetterSpacing(0.15f);
        saveBtn.setAllCaps(true);

        GradientDrawable saveBg = new GradientDrawable();
        saveBg.setColor(Color.WHITE);
        saveBg.setCornerRadius(dp(12));
        saveBtn.setBackground(saveBg);
        saveBtn.setPadding(dp(16), dp(14), dp(16), dp(14));

        saveBtn.setOnClickListener(v -> {
            try {
                String text = odoInput.getText().toString().trim();
                float newOdo = Float.parseFloat(text);
                if (newOdo > 0) {
                    saveOdoValue(newOdo);
                    // Vibrate confirm
                    Vibrator vib = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
                    if (vib != null) {
                        if (Build.VERSION.SDK_INT >= 26) {
                            vib.vibrate(VibrationEffect.createOneShot(80, VibrationEffect.DEFAULT_AMPLITUDE));
                        } else {
                            vib.vibrate(80);
                        }
                    }
                    dismiss();
                }
            } catch (NumberFormatException e) {
                // Invalid input - shake the input
                odoInput.requestFocus();
            }
        });

        card.addView(saveBtn);

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
                | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
            PixelFormat.TRANSLUCENT
        );
        params.gravity = Gravity.CENTER;

        // Use software keyboard flags
        params.softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_PAN
                | WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE;

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
        odoInput.requestFocus();
        odoInput.selectAll();
    }

    private void saveOdoValue(float newOdo) {
        SharedPreferences prefs = context.getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        float oldOdo = prefs.getFloat("latest_odo_raw", 0.0f);
        float diff = newOdo - oldOdo;

        // Update ODO
        editor.putFloat("latest_odo_raw", newOdo);
        editor.putString("latest_odo", String.format("ODO: %.0f", newOdo));

        // If new ODO is higher, update trip and fuel accordingly
        if (diff > 0 && oldOdo > 0) {
            float kmPerLiter = prefs.getFloat("setting_consumption", 21.4f);
            float currentLiters = prefs.getFloat("latest_fuelLiters_raw", 0.0f);
            float currentTrip = prefs.getFloat("latest_trip_raw", 0.0f);
            float oilLeft = prefs.getFloat("latest_oilLeft_raw", 1000.0f);
            float tankCap = prefs.getFloat("setting_tank", 7.0f);

            // Consume fuel for the driven distance
            float consumedLiters = (kmPerLiter > 0) ? (diff / kmPerLiter) : 0;
            float newLiters = Math.max(0, currentLiters - consumedLiters);
            float newTrip = currentTrip + diff;
            float newOil = Math.max(0, oilLeft - diff);
            float newRange = newLiters * kmPerLiter;
            int fuelPercent = tankCap > 0 ? Math.round((newLiters / tankCap) * 100) : 0;

            editor.putFloat("latest_fuelLiters_raw", newLiters);
            editor.putFloat("latest_trip_raw", newTrip);
            editor.putFloat("latest_oilLeft_raw", newOil);
            editor.putString("latest_range", String.format("%.1f KM", newRange));
            editor.putInt("latest_fuelPercent", fuelPercent);
            editor.putString("latest_litersLeft", String.format("%.1f L", newLiters));
            editor.putString("latest_oilLeft", String.format("OIL: %.0f", newOil));
            editor.putString("latest_trip", String.format("TRIP: %.1f", newTrip));
        }

        editor.commit();

        // Trigger widget update
        try {
            android.content.Intent intent = new android.content.Intent(context, SpeedometerWidget.class);
            intent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
            context.sendBroadcast(intent);
        } catch (Exception e) {
            // Widget update failed, not critical
        }

        // Also store a flag so the JS side picks up the new ODO on next resume
        editor.putFloat("overlay_sync_odo", newOdo);
        editor.putBoolean("overlay_sync_pending", true);
        editor.apply();
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
