-- Migration to add missing desktop login customization columns
-- This ensures that desktop settings are also persisted correctly

ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_logo_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_logo_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_scale FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS login_bg_opacity FLOAT8 DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS login_mobile_bg_opacity FLOAT8 DEFAULT 0.8;

-- Some rows might already have login_card_opacity/color/border_color from older scripts but let's be safe
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT8 DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33';

-- User settings sync for consistency
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS login_logo_scale FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_logo_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_logo_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_card_scale FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_blur INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_brightness FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_zoom FLOAT8 DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS login_bg_x_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_y_offset FLOAT8 DEFAULT 0,
ADD COLUMN IF NOT EXISTS login_bg_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS login_bg_opacity FLOAT8 DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS login_mobile_bg_fit TEXT DEFAULT 'cover',
ADD COLUMN IF NOT EXISTS login_mobile_bg_opacity FLOAT8 DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS login_card_opacity FLOAT8 DEFAULT 0.6,
ADD COLUMN IF NOT EXISTS login_card_color TEXT DEFAULT '#000000',
ADD COLUMN IF NOT EXISTS login_card_border_color TEXT DEFAULT '#ffffff33';

-- Initialize desktop settings if they are newly added
UPDATE public.gym_settings 
SET 
  login_logo_scale = COALESCE(login_logo_scale, 1.0),
  login_logo_x_offset = COALESCE(login_logo_x_offset, 0),
  login_logo_y_offset = COALESCE(login_logo_y_offset, 0),
  login_card_x_offset = COALESCE(login_card_x_offset, 0),
  login_card_y_offset = COALESCE(login_card_y_offset, 0),
  login_card_scale = COALESCE(login_card_scale, 1.0),
  login_bg_blur = COALESCE(login_bg_blur, 0),
  login_bg_brightness = COALESCE(login_bg_brightness, 1.0),
  login_bg_zoom = COALESCE(login_bg_zoom, 1.0),
  login_bg_x_offset = COALESCE(login_bg_x_offset, 0),
  login_bg_y_offset = COALESCE(login_bg_y_offset, 0),
  login_bg_fit = COALESCE(login_bg_fit, 'cover'),
  login_bg_opacity = COALESCE(login_bg_opacity, 0.8),
  login_mobile_bg_fit = COALESCE(login_mobile_bg_fit, 'cover'),
  login_mobile_bg_opacity = COALESCE(login_mobile_bg_opacity, 0.8),
  login_card_opacity = COALESCE(login_card_opacity, 0.6),
  login_card_color = COALESCE(login_card_color, '#000000'),
  login_card_border_color = COALESCE(login_card_border_color, '#ffffff33');
