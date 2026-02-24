-- Migration to add login customization columns to gym_settings and user_settings
-- Created to fix 400 error during settings save

-- Add columns to gym_settings
ALTER TABLE public.gym_settings 
ADD COLUMN IF NOT EXISTS login_show_logo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS login_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS login_accent_color TEXT DEFAULT '#D4AF37';

-- Add columns to user_settings
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS login_show_logo BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS login_text_color TEXT DEFAULT '#ffffff',
ADD COLUMN IF NOT EXISTS login_accent_color TEXT DEFAULT '#D4AF37';

-- Update existing rows to have default values if they are null
UPDATE public.gym_settings 
SET 
  login_show_logo = COALESCE(login_show_logo, TRUE),
  login_text_color = COALESCE(login_text_color, '#ffffff'),
  login_accent_color = COALESCE(login_accent_color, '#D4AF37');

UPDATE public.user_settings 
SET 
  login_show_logo = COALESCE(login_show_logo, TRUE),
  login_text_color = COALESCE(login_text_color, '#ffffff'),
  login_accent_color = COALESCE(login_accent_color, '#D4AF37');
