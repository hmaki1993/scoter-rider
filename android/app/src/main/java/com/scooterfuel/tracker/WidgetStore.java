package com.scooterfuel.tracker;

import android.content.Context;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.Properties;

public class WidgetStore {
    private static final String FILE_NAME = "widget_design.properties";

    public static void saveDesign(Context ctx, String color, int opacity) {
        try {
            File f = new File(ctx.getFilesDir(), FILE_NAME);
            Properties p = new Properties();
            p.setProperty("accentColor", color);
            p.setProperty("opacity", String.valueOf(opacity));
            FileOutputStream fos = new FileOutputStream(f);
            p.store(fos, null);
            fos.close();
        } catch(Exception ignored) {}
    }

    public static String getColor(Context ctx) {
        try {
            File f = new File(ctx.getFilesDir(), FILE_NAME);
            if(f.exists()){
                Properties p = new Properties();
                FileInputStream fis = new FileInputStream(f);
                p.load(fis);
                fis.close();
                String color = p.getProperty("accentColor");
                if (color != null && !color.isEmpty()) {
                    return color;
                }
            }
        }catch(Exception ignored){}
        return "#00f0ff";
    }

    public static int getOpacity(Context ctx) {
        try {
            File f = new File(ctx.getFilesDir(), FILE_NAME);
            if(f.exists()){
                Properties p = new Properties();
                FileInputStream fis = new FileInputStream(f);
                p.load(fis);
                fis.close();
                String op = p.getProperty("opacity");
                if (op != null && !op.isEmpty()) {
                    return Integer.parseInt(op);
                }
            }
        }catch(Exception ignored){}
        return 100;
    }
}
