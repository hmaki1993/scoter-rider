-- DEFINITIVE FIX: Add ALL required theme and login columns to gym_settings and user_settings
-- This script uses standard SQL to avoid errors and ensure 100% schema compatibility.

-- 1. BASE THEME COLUMNS (If missing)
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS academy_name TEXT DEFAULT 'Academy System';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS gym_address TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS gym_phone TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0B120F';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS surface_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS input_bg_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS text_color_base TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS text_color_muted TEXT;

-- 2. DESKTOP LOGIN COLUMNS
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_url TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_logo_url TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT8 DEFAULT 0.6;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_scale FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_show_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_text_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_accent_color TEXT DEFAULT '#D4AF37';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_logo_opacity FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_logo_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_logo_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_blur INT DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_brightness FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_zoom FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_fit TEXT DEFAULT 'cover';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_bg_opacity FLOAT8 DEFAULT 0.8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_width INT DEFAULT 440;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_height INT DEFAULT 600;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_heading_size INT DEFAULT 24;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_input_size INT DEFAULT 24;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_label_size INT DEFAULT 11;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_border_width NUMERIC DEFAULT 1;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_glow_size NUMERIC DEFAULT 60;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_card_glow_opacity NUMERIC DEFAULT 50;

-- 3. MOBILE LOGIN COLUMNS
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_url TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_url TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_opacity FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_border_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_scale FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_show_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_text_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_accent_color TEXT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_opacity FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_scale FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_x_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_y_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_blur INT;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_brightness FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_zoom FLOAT8 DEFAULT 1.0;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_x_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_y_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_fit TEXT DEFAULT 'cover';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_opacity FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_x_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_y_offset FLOAT8;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_width INT DEFAULT 340;
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS login_mobile_card_height INT DEFAULT 500;

-- 4. SYNC TO USER_SETTINGS
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_url TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_logo_url TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT8 DEFAULT 0.6;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_scale FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_show_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_text_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_accent_color TEXT DEFAULT '#D4AF37';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_logo_opacity FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_logo_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_logo_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_blur INT DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_brightness FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_zoom FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_fit TEXT DEFAULT 'cover';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_bg_opacity FLOAT8 DEFAULT 0.8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_x_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_y_offset FLOAT8 DEFAULT 0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_width INT DEFAULT 440;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_height INT DEFAULT 600;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_heading_size INT DEFAULT 24;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_input_size INT DEFAULT 24;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_label_size INT DEFAULT 11;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_border_width NUMERIC DEFAULT 1;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_glow_size NUMERIC DEFAULT 60;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_card_glow_opacity NUMERIC DEFAULT 50;

ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_url TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_url TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_opacity FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_border_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_scale FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_show_logo BOOLEAN DEFAULT TRUE;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_text_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_accent_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_opacity FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_scale FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_x_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_logo_y_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_blur INT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_brightness FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_zoom FLOAT8 DEFAULT 1.0;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_x_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_y_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_fit TEXT DEFAULT 'cover';
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_bg_opacity FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_x_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_y_offset FLOAT8;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_width INT DEFAULT 340;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS login_mobile_card_height INT DEFAULT 500;

-- 5. Final Initialization
UPDATE public.gym_settings SET
    login_card_opacity = COALESCE(login_card_opacity, 0.6),
    login_card_scale = COALESCE(login_card_scale, 1.0),
    login_show_logo = COALESCE(login_show_logo, TRUE),
    login_logo_opacity = COALESCE(login_logo_opacity, 1.0),
    login_logo_scale = COALESCE(login_logo_scale, 1.0),
    login_bg_blur = COALESCE(login_bg_blur, 0),
    login_bg_brightness = COALESCE(login_bg_brightness, 1.0),
    login_bg_zoom = COALESCE(login_bg_zoom, 1.0),
    login_bg_opacity = COALESCE(login_bg_opacity, 0.8),
    login_card_width = COALESCE(login_card_width, 440),
    login_card_height = COALESCE(login_card_height, 600),
    login_heading_size = COALESCE(login_heading_size, 24),
    login_input_size = COALESCE(login_input_size, 24),
    login_label_size = COALESCE(login_label_size, 11),
    login_card_border_width = COALESCE(login_card_border_width, 1),
    login_card_glow_size = COALESCE(login_card_glow_size, 60),
    login_card_glow_opacity = COALESCE(login_card_glow_opacity, 50),
    login_mobile_show_logo = COALESCE(login_mobile_show_logo, TRUE),
    login_mobile_card_width = COALESCE(login_mobile_card_width, 340),
    login_mobile_card_height = COALESCE(login_mobile_card_height, 500),
    login_mobile_bg_zoom = COALESCE(login_mobile_bg_zoom, 1.0);
