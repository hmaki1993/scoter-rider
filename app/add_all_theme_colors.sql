-- ============================================================
-- DEFINITIVE THEME COLORS MIGRATION
-- Run this in Supabase SQL Editor to fix theme persistence
-- ============================================================

-- gym_settings: Core colors
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#0B120F';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS surface_color TEXT DEFAULT 'rgba(21, 31, 28, 0.8)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS input_bg_color TEXT DEFAULT '#070D0B';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS text_color_base TEXT DEFAULT '#f8fafc';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS text_color_muted TEXT DEFAULT 'rgba(255,255,255,0.6)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS hover_color TEXT DEFAULT 'rgba(163, 0, 0, 0.4)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS hover_border_color TEXT DEFAULT 'rgba(163, 0, 0, 0.2)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS brand_label_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS premium_badge_color TEXT DEFAULT '#A30000';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS search_bg_color TEXT DEFAULT 'rgba(255,255,255,0.03)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS search_text_color TEXT DEFAULT '#ffffff';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS search_icon_color TEXT DEFAULT 'rgba(255,255,255,0.4)';
ALTER TABLE public.gym_settings ADD COLUMN IF NOT EXISTS search_border_color TEXT DEFAULT 'rgba(255,255,255,0.08)';

-- user_settings: Same color columns
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS surface_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS input_bg_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS text_color_base TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS text_color_muted TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hover_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS hover_border_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS brand_label_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS premium_badge_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS search_bg_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS search_text_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS search_icon_color TEXT;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS search_border_color TEXT;
