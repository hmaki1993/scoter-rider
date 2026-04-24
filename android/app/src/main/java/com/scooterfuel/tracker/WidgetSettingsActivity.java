package com.scooterfuel.tracker;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.widget.RadioButton;
import android.widget.RadioGroup;
import android.widget.TextView;

public class WidgetSettingsActivity extends Activity {

    private SharedPreferences prefs;
    private RadioGroup rgColors;
    private RadioGroup rgOpacity;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_widget_settings);

        prefs = getSharedPreferences("FuelTrackerPrefs", Context.MODE_PRIVATE);

        rgColors = findViewById(R.id.rg_colors);
        rgOpacity = findViewById(R.id.rg_opacity);
        TextView btnSave = findViewById(R.id.btn_save);

        loadCurrentSettings();

        btnSave.setOnClickListener(v -> saveSettingsAndExit());
    }

    private void loadCurrentSettings() {
        String currentColor = WidgetStore.getColor(this);
        int currentOpacity = WidgetStore.getOpacity(this);

        // Map Color
        if ("#00f0ff".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_cyan);
        } else if ("#ff3366".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_red);
        } else if ("#00ffaa".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_green);
        } else if ("#f0ff00".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_yellow);
        } else if ("#b200ff".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_purple);
        } else if ("#ff6600".equalsIgnoreCase(currentColor)) {
            rgColors.check(R.id.rb_color_orange);
        } else {
            rgColors.check(R.id.rb_color_cyan);
        }

        // Map Opacity
        switch (currentOpacity) {
            case 0: rgOpacity.check(R.id.rb_op_0); break;
            case 20: rgOpacity.check(R.id.rb_op_20); break;
            case 40: rgOpacity.check(R.id.rb_op_40); break;
            case 60: rgOpacity.check(R.id.rb_op_60); break;
            case 80: rgOpacity.check(R.id.rb_op_80); break;
            case 100: default: rgOpacity.check(R.id.rb_op_100); break;
        }
    }

    private void saveSettingsAndExit() {
        String selectedColor = "#00f0ff";
        int checkedColorId = rgColors.getCheckedRadioButtonId();
        if (checkedColorId == R.id.rb_color_cyan) selectedColor = "#00f0ff";
        else if (checkedColorId == R.id.rb_color_red) selectedColor = "#ff3366";
        else if (checkedColorId == R.id.rb_color_green) selectedColor = "#00ffaa";
        else if (checkedColorId == R.id.rb_color_yellow) selectedColor = "#f0ff00";
        else if (checkedColorId == R.id.rb_color_purple) selectedColor = "#b200ff";
        else if (checkedColorId == R.id.rb_color_orange) selectedColor = "#ff6600";

        int selectedOpacity = 100;
        int checkedOpId = rgOpacity.getCheckedRadioButtonId();
        if (checkedOpId == R.id.rb_op_0) selectedOpacity = 0;
        else if (checkedOpId == R.id.rb_op_20) selectedOpacity = 20;
        else if (checkedOpId == R.id.rb_op_40) selectedOpacity = 40;
        else if (checkedOpId == R.id.rb_op_60) selectedOpacity = 60;
        else if (checkedOpId == R.id.rb_op_80) selectedOpacity = 80;
        else if (checkedOpId == R.id.rb_op_100) selectedOpacity = 100;

        // Save using robust File I/O completely bypassing OS caching bugs
        WidgetStore.saveDesign(this, selectedColor, selectedOpacity);

        // Broadcast to trigger Widget live refresh
        Intent intent = new Intent(this, SpeedometerWidget.class);
        intent.setAction(SpeedometerWidget.ACTION_UPDATE_STATS);
        // Force the widget to update live by including them directly in the intent
        intent.putExtra("accentColor", selectedColor);
        intent.putExtra("opacity", selectedOpacity);
        sendBroadcast(intent);

        // Close Dialog
        finish();
    }
}
