-- ============================================================
-- MASTER SCHEMA EXPORT - HEALY ACADEMY SYSTEM (CONSOLIDATED)
-- ============================================================
-- Created: 2026-03-12
-- This file includes ALL core tables, finance history, jump sessions,
-- communication/chat tables, and extended theme settings.
--
-- HOW TO USE:
-- 1. Create a new Supabase project.
-- 2. Open the SQL Editor in the new project.
-- 3. Copy and paste this ENTIRE file and click "Run".
-- 4. Done! Your database is ready.
-- ============================================================

-- STEP 1: Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- STEP 2: Create Enum Types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'head_coach', 'coach', 'reception', 'cleaner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('cash', 'knet', 'credit', 'bank_transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ================================================================
-- CORE TABLES
-- ================================================================

-- [1] Profiles (Links to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  role user_role DEFAULT 'coach',
  avatar_url TEXT,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  pt_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [2] Students
CREATE TABLE IF NOT EXISTS public.students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  birth_date DATE,
  phone TEXT,
  father_phone TEXT,
  mother_phone TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  photo_url TEXT,
  coach_id UUID REFERENCES public.profiles(id),
  training_days TEXT[] DEFAULT '{}',
  training_schedule JSONB,
  sessions_remaining INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  plan_id UUID,
  subscription_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [3] Groups
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  coach_id UUID REFERENCES public.profiles(id),
  days TEXT[],
  start_time TIME,
  end_time TIME,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [4] Student-Group link
CREATE TABLE IF NOT EXISTS public.student_groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, group_id)
);

-- [5] Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_months INTEGER DEFAULT 1,
  sessions_limit INTEGER,
  sessions_per_week INTEGER DEFAULT 3,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [6] Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.subscription_plans(id),
  plan_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  is_paid BOOLEAN DEFAULT TRUE,
  payment_method payment_method DEFAULT 'cash',
  sessions_limit INTEGER,
  sessions_remaining INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [7] Attendance
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  status attendance_status DEFAULT 'present',
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [8] Coach Attendance
CREATE TABLE IF NOT EXISTS public.coach_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'present',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- FINANCE TABLES
-- ================================================================

-- [9] Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'cash',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [10] Expenses / General Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [11] Refunds
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  amount DECIMAL(10,2) NOT NULL,
  refund_date DATE DEFAULT CURRENT_DATE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [12] Finance History (Recycle Bin functionality)
CREATE TABLE IF NOT EXISTS public.finance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    row_id UUID NOT NULL,
    row_data JSONB NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('DELETE', 'UPDATE')),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- PT (Personal Training) TABLES
-- ================================================================

-- [13] PT Subscriptions
CREATE TABLE IF NOT EXISTS public.pt_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id),
  coach_id UUID REFERENCES public.profiles(id),
  student_name TEXT,
  sessions_total INTEGER NOT NULL DEFAULT 10,
  sessions_used INTEGER DEFAULT 0,
  price_per_session DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2) DEFAULT 0,
  coach_share DECIMAL(5,2) DEFAULT 50,
  start_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [14] PT Attendance
CREATE TABLE IF NOT EXISTS public.pt_attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pt_subscription_id UUID REFERENCES public.pt_subscriptions(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIMESTAMPTZ DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'completed', 'absent')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- COMMUNICATION SUITE TABLES
-- ================================================================

-- [15] Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'direct', -- 'direct' or 'group'
  name TEXT, -- only for group chats
  avatar_url TEXT, -- optional group avatar
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- [16] Conversation Participants Table
CREATE TABLE IF NOT EXISTS public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- [17] Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT,
  type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'voice', 'video', 'call_event'
  media_url TEXT,
  media_duration INTEGER, -- seconds (for voice/video)
  media_size INTEGER,     -- bytes
  call_status TEXT,       -- for call_event type: 'missed', 'answered', 'rejected'
  call_duration INTEGER,  -- seconds for ended calls
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- [18] Call Records Table
CREATE TABLE IF NOT EXISTS public.call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  caller_id UUID REFERENCES public.profiles(id),
  call_type TEXT NOT NULL DEFAULT 'audio', -- 'audio' or 'video'
  status TEXT DEFAULT 'ringing',           -- 'ringing', 'active', 'ended', 'missed', 'rejected'
  agora_channel_id TEXT UNIQUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER
);

-- [19] Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  related_student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  related_coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [20] Voice Broadcasts (Walkie-Talkie)
CREATE TABLE IF NOT EXISTS public.voice_broadcasts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id),
  audio_url TEXT NOT NULL,
  duration DECIMAL(5,2),
  target_users UUID[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- CUSTOM APP & USER TABLES
-- ================================================================

-- [21] Jump Sessions
CREATE TABLE IF NOT EXISTS public.jump_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    jump_count INTEGER DEFAULT 0,
    work_time INTEGER DEFAULT 0,
    rest_time INTEGER DEFAULT 0,
    jpm INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- [22] User Settings (Per-user customization)
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    language TEXT DEFAULT 'en',
    primary_color TEXT,
    secondary_color TEXT,
    accent_color TEXT,
    font_family TEXT,
    font_scale FLOAT,
    border_radius TEXT,
    glass_opacity FLOAT,
    surface_color TEXT,
    search_icon_color TEXT,
    search_bg_color TEXT,
    search_border_color TEXT,
    search_text_color TEXT,
    hover_color TEXT,
    hover_border_color TEXT,
    input_bg_color TEXT,
    clock_position TEXT,
    -- Expanded login customization columns
    login_bg_url TEXT,
    login_logo_url TEXT,
    login_card_opacity FLOAT8 DEFAULT 0.6,
    login_card_color TEXT DEFAULT '#000000',
    login_card_border_color TEXT DEFAULT '#ffffff33',
    login_card_scale FLOAT8 DEFAULT 1.0,
    login_show_logo BOOLEAN DEFAULT TRUE,
    login_text_color TEXT DEFAULT '#ffffff',
    login_accent_color TEXT DEFAULT '#D4AF37',
    login_logo_opacity FLOAT8 DEFAULT 1.0,
    login_logo_scale FLOAT8 DEFAULT 1.0,
    login_logo_x_offset FLOAT8 DEFAULT 0,
    login_logo_y_offset FLOAT8 DEFAULT 0,
    login_bg_blur INT DEFAULT 0,
    login_bg_brightness FLOAT8 DEFAULT 1.0,
    login_bg_zoom FLOAT8 DEFAULT 1.0,
    login_bg_x_offset FLOAT8 DEFAULT 0,
    login_bg_y_offset FLOAT8 DEFAULT 0,
    login_bg_fit TEXT DEFAULT 'cover',
    login_bg_opacity FLOAT8 DEFAULT 0.8,
    login_card_x_offset FLOAT8 DEFAULT 0,
    login_card_y_offset FLOAT8 DEFAULT 0,
    login_card_width INT DEFAULT 440,
    login_card_height INT DEFAULT 600,
    login_heading_size INT DEFAULT 24,
    login_input_size INT DEFAULT 24,
    login_label_size INT DEFAULT 11,
    login_card_border_width NUMERIC DEFAULT 1,
    login_card_glow_size NUMERIC DEFAULT 60,
    login_card_glow_opacity NUMERIC DEFAULT 50,
    login_mobile_bg_url TEXT,
    login_mobile_logo_url TEXT,
    login_mobile_card_opacity FLOAT8,
    login_mobile_card_color TEXT,
    login_mobile_card_border_color TEXT,
    login_mobile_card_scale FLOAT8,
    login_mobile_show_logo BOOLEAN DEFAULT TRUE,
    login_mobile_text_color TEXT,
    login_mobile_accent_color TEXT,
    login_mobile_logo_opacity FLOAT8,
    login_mobile_logo_scale FLOAT8,
    login_mobile_logo_x_offset FLOAT8,
    login_mobile_logo_y_offset FLOAT8,
    login_mobile_bg_blur INT,
    login_mobile_bg_brightness FLOAT8,
    login_mobile_bg_zoom FLOAT8 DEFAULT 1.0,
    login_mobile_bg_x_offset FLOAT8,
    login_mobile_bg_y_offset FLOAT8,
    login_mobile_bg_fit TEXT DEFAULT 'cover',
    login_mobile_bg_opacity FLOAT8,
    login_mobile_card_x_offset FLOAT8,
    login_mobile_card_y_offset FLOAT8,
    login_mobile_card_width INT DEFAULT 340,
    login_mobile_card_height INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- [23] Gym Settings
CREATE TABLE IF NOT EXISTS public.gym_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  gym_name TEXT DEFAULT 'New Academy',
  academy_name TEXT DEFAULT 'New Academy',
  gym_address TEXT DEFAULT 'Cairo, Egypt',
  gym_phone TEXT DEFAULT '+20 123 456 7890',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  primary_color TEXT DEFAULT '#ef4444',
  secondary_color TEXT DEFAULT '#1f2937',
  sidebar_bg TEXT DEFAULT '#0F1923',
  header_bg TEXT DEFAULT '#0F1923',
  card_bg TEXT DEFAULT '#1a2634',
  text_color TEXT DEFAULT '#ffffff',
  accent_color TEXT DEFAULT '#ef4444',
  button_color TEXT DEFAULT '#ef4444',
  button_text_color TEXT DEFAULT '#ffffff',
  hover_color TEXT DEFAULT '#dc2626',
  input_bg_color TEXT DEFAULT '#1e2a38',
  search_icon_color TEXT DEFAULT '#94a3b8',
  currency TEXT DEFAULT 'EGP',
  currency_symbol TEXT DEFAULT 'ج.م',
  language TEXT DEFAULT 'ar',
  -- Theme columns
  surface_color TEXT,
  text_color_base TEXT,
  text_color_muted TEXT,
  -- Desktop Login Columns
  login_bg_url TEXT,
  login_logo_url TEXT,
  login_card_opacity FLOAT8 DEFAULT 0.6,
  login_card_color TEXT DEFAULT '#000000',
  login_card_border_color TEXT DEFAULT '#ffffff33',
  login_card_scale FLOAT8 DEFAULT 1.0,
  login_show_logo BOOLEAN DEFAULT TRUE,
  login_text_color TEXT DEFAULT '#ffffff',
  login_accent_color TEXT DEFAULT '#D4AF37',
  login_logo_opacity FLOAT8 DEFAULT 1.0,
  login_logo_scale FLOAT8 DEFAULT 1.0,
  login_logo_x_offset FLOAT8 DEFAULT 0,
  login_logo_y_offset FLOAT8 DEFAULT 0,
  login_bg_blur INT DEFAULT 0,
  login_bg_brightness FLOAT8 DEFAULT 1.0,
  login_bg_zoom FLOAT8 DEFAULT 1.0,
  login_bg_x_offset FLOAT8 DEFAULT 0,
  login_bg_y_offset FLOAT8 DEFAULT 0,
  login_bg_fit TEXT DEFAULT 'cover',
  login_bg_opacity FLOAT8 DEFAULT 0.8,
  login_card_x_offset FLOAT8 DEFAULT 0,
  login_card_y_offset FLOAT8 DEFAULT 0,
  login_card_width INT DEFAULT 440,
  login_card_height INT DEFAULT 600,
  login_heading_size INT DEFAULT 24,
  login_input_size INT DEFAULT 24,
  login_label_size INT DEFAULT 11,
  login_card_border_width NUMERIC DEFAULT 1,
  login_card_glow_size NUMERIC DEFAULT 60,
  login_card_glow_opacity NUMERIC DEFAULT 50,
  -- Mobile Login Columns
  login_mobile_bg_url TEXT,
  login_mobile_logo_url TEXT,
  login_mobile_card_opacity FLOAT8,
  login_mobile_card_color TEXT,
  login_mobile_card_border_color TEXT,
  login_mobile_card_scale FLOAT8,
  login_mobile_show_logo BOOLEAN DEFAULT TRUE,
  login_mobile_text_color TEXT,
  login_mobile_accent_color TEXT,
  login_mobile_logo_opacity FLOAT8,
  login_mobile_logo_scale FLOAT8,
  login_mobile_logo_x_offset FLOAT8,
  login_mobile_logo_y_offset FLOAT8,
  login_mobile_bg_blur INT,
  login_mobile_bg_brightness FLOAT8,
  login_mobile_bg_zoom FLOAT8 DEFAULT 1.0,
  login_mobile_bg_x_offset FLOAT8,
  login_mobile_bg_y_offset FLOAT8,
  login_mobile_bg_fit TEXT DEFAULT 'cover',
  login_mobile_bg_opacity FLOAT8,
  login_mobile_card_x_offset FLOAT8,
  login_mobile_card_y_offset FLOAT8,
  login_mobile_card_width INT DEFAULT 340,
  login_mobile_card_height INT DEFAULT 500,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO public.gym_settings (gym_name, academy_name) 
VALUES ('New Academy', 'New Academy')
ON CONFLICT DO NOTHING;


-- ================================================================
-- ROW LEVEL SECURITY (RLS)
-- ================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pt_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jump_sessions ENABLE ROW LEVEL SECURITY;

-- POLICIES (Simplified "Enable all for authenticated" for faster setup)
CREATE POLICY "Profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Core/Finance Policies
CREATE POLICY "Enable all for authenticated" ON public.students FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.groups FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.student_groups FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.subscription_plans FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.subscriptions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.attendance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.coach_attendance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.payments FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.expenses FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.refunds FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.pt_subscriptions FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.pt_attendance FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.gym_settings FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Enable all for authenticated" ON public.voice_broadcasts FOR ALL TO authenticated USING (TRUE) WITH CHECK (TRUE);

-- Communication Policies
CREATE POLICY "conversations_select" ON public.conversations FOR SELECT USING (id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "conversations_insert" ON public.conversations FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "participants_select" ON public.conversation_participants FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "calls_select" ON public.call_records FOR SELECT USING (conversation_id IN (SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()));
CREATE POLICY "calls_insert" ON public.call_records FOR INSERT WITH CHECK (caller_id = auth.uid());

-- Notifications
CREATE POLICY "Notifications viewable by all authenticated" ON public.notifications FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "Allow delete notifications" ON public.notifications FOR DELETE TO authenticated USING (TRUE);

-- User-Specific Policies
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own jump sessions" ON public.jump_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins and Coaches can view all jump sessions" ON public.jump_sessions FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin' OR role = 'coach')));

-- Finance History
CREATE POLICY "Allow admins to manage finance history" ON public.finance_history FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ================================================================
-- TRIGGERS & FUNCTIONS
-- ================================================================

-- Auto-create profile on Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'coach')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC: Delete user by ID
CREATE OR REPLACE FUNCTION public.delete_user_by_id(user_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM auth.users WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.delete_user_by_id TO authenticated;

-- Notification Triggers (Example)
CREATE OR REPLACE FUNCTION public.notify_new_student_v2()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (title, message, type, related_student_id, related_coach_id)
  VALUES ('New Gymnast', NEW.full_name || ' just registered', 'student', NEW.id, NEW.coach_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_student_created AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION public.notify_new_student_v2();


-- ================================================================
-- REALTIME
-- ================================================================
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.messages; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.call_records; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;


-- ================================================================
-- ALL DONE!
-- ================================================================
