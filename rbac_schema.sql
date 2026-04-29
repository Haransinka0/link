-- RBAC Schema - Minimal version (no constraint changes)
-- Run this in the Supabase SQL Editor

-- 1. Add discussion thread table (only creates if not exists)
CREATE TABLE IF NOT EXISTS public.template_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.post_templates(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add notification table (only creates if not exists)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('approval_request', 'approval_decision', 'mention')),
  title text NOT NULL,
  message text,
  template_id uuid REFERENCES public.post_templates(id) ON DELETE SET NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Add indexes
CREATE INDEX IF NOT EXISTS idx_template_discussions_template_id ON public.template_discussions(template_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_template_id ON public.notifications(template_id);

-- 4. Enable RLS
ALTER TABLE public.template_discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for discussions
DROP POLICY IF EXISTS "discussions_select_auth" ON public.template_discussions;
CREATE POLICY "discussions_select_auth" ON public.template_discussions FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "discussions_insert_auth" ON public.template_discussions;
CREATE POLICY "discussions_insert_auth" ON public.template_discussions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. RLS policies for notifications
DROP POLICY IF EXISTS "notifications_select_auth" ON public.notifications;
CREATE POLICY "notifications_select_auth" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update_auth" ON public.notifications;
CREATE POLICY "notifications_update_auth" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 7. Grant permissions
GRANT SELECT ON public.template_discussions TO authenticated;
GRANT INSERT ON public.template_discussions TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT INSERT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;

-- Show result
SELECT 'RBAC tables created!' as result;