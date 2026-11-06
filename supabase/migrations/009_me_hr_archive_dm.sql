-- Consolidated Shanji M&E, HR/Admin, Archive and Private Messaging migration.
-- Review only. Do not execute without approval.

-- (Full corrected SQL as prepared in final technical review.)
-- M&E
ALTER TABLE public.indicator_categories ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='indicator_categories' AND policyname='ic_select') THEN
    CREATE POLICY ic_select ON public.indicator_categories FOR SELECT USING (organization_id IN (SELECT organization_id FROM public."Profiles" WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='indicator_categories' AND policyname='ic_manage') THEN
    CREATE POLICY ic_manage ON public.indicator_categories FOR ALL USING (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name IN ('Organization Admin','Project Manager'))) WITH CHECK (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name IN ('Organization Admin','Project Manager')));
  END IF;
END $$;

ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS category_id UUID;
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS baseline_value NUMERIC;
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS reporting_frequency TEXT DEFAULT 'monthly';
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public."Profiles"(id);
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS content_version INT NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='indicators_category_fk') THEN
    ALTER TABLE public.indicators ADD CONSTRAINT indicators_category_fk FOREIGN KEY (category_id) REFERENCES public.indicator_categories(id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.indicator_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  actual_value NUMERIC NOT NULL,
  submitted_by UUID NOT NULL REFERENCES public."Profiles"(id),
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','correction_requested')),
  verified_by UUID REFERENCES public."Profiles"(id),
  verified_at TIMESTAMPTZ,
  verification_comment TEXT,
  content_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (reporting_period_end >= reporting_period_start),
  UNIQUE (indicator_id, reporting_period_start, reporting_period_end)
);

CREATE OR REPLACE FUNCTION public.enforce_content_edit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.actual_value IS DISTINCT FROM OLD.actual_value OR NEW.reporting_period_start IS DISTINCT FROM OLD.reporting_period_start OR NEW.reporting_period_end IS DISTINCT FROM OLD.reporting_period_end) THEN
    IF OLD.content_version >= 1 THEN RAISE EXCEPTION 'Content already edited'; END IF;
    NEW.content_version = OLD.content_version + 1;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_measurement_content_edit') THEN
    CREATE TRIGGER trg_measurement_content_edit BEFORE UPDATE ON public.indicator_measurements FOR EACH ROW EXECUTE FUNCTION public.enforce_content_edit();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.guard_measurement_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    IF NEW.verified_by = NEW.submitted_by THEN RAISE EXCEPTION 'Self-verification not allowed'; END IF;
    IF NEW.verified_by IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Verifier must be authenticated user'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.project_members pm
      JOIN public."Roles" r ON r.id = pm.role_id
      WHERE pm.user_id = auth.uid() AND pm.project_id = NEW.project_id
        AND r.name IN ('Project Manager','M&E Officer','OHS Officer')
    ) THEN RAISE EXCEPTION 'Not authorized to verify'; END IF;
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_measurement_verification_guard') THEN
    CREATE TRIGGER trg_measurement_verification_guard BEFORE UPDATE ON public.indicator_measurements FOR EACH ROW EXECUTE FUNCTION public.guard_measurement_verification();
  END IF;
END $$;

ALTER TABLE public.indicator_measurements ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='indicator_measurements' AND policyname='im_select') THEN
    CREATE POLICY im_select ON public.indicator_measurements FOR SELECT USING (project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='indicator_measurements' AND policyname='im_insert') THEN
    CREATE POLICY im_insert ON public.indicator_measurements FOR INSERT WITH CHECK (project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM public."Roles" WHERE name IN ('Project Manager','Assistant Project Manager','M&E Officer'))) AND submitted_by = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='indicator_measurements' AND policyname='im_update') THEN
    CREATE POLICY im_update ON public.indicator_measurements FOR UPDATE USING (project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM public."Roles" WHERE name IN ('Project Manager','Assistant Project Manager','M&E Officer','OHS Officer')))) WITH CHECK (project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid() AND role_id IN (SELECT id FROM public."Roles" WHERE name IN ('Project Manager','Assistant Project Manager','M&E Officer','OHS Officer'))));
  END IF;
END $$;

-- HR/Admin
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public."Organizations"(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(trim(email))) STORED,
  role_id UUID NOT NULL REFERENCES public."Roles"(id),
  invited_by UUID NOT NULL REFERENCES public."Profiles"(id),
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','expired','revoked')),
  expires_at TIMESTAMPTZ NOT NULL CHECK (expires_at > created_at),
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES public."Profiles"(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (accepted_at IS NULL OR status='accepted')
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pending_invitation ON public.organization_invitations (organization_id, email_normalized) WHERE status='pending';

ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_invitations' AND policyname='oi_admin_all') THEN
    CREATE POLICY oi_admin_all ON public.organization_invitations FOR ALL USING (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin')) WITH CHECK (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.role_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public."Organizations"(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public."Profiles"(id) ON DELETE RESTRICT,
  previous_role_id UUID REFERENCES public."Roles"(id),
  new_role_id UUID NOT NULL REFERENCES public."Roles"(id),
  changed_by UUID NOT NULL REFERENCES public."Profiles"(id) ON DELETE RESTRICT,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.prevent_role_history_mutation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'role_change_history is immutable'; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_role_history_no_update') THEN
    CREATE TRIGGER trg_role_history_no_update BEFORE UPDATE ON public.role_change_history FOR EACH ROW EXECUTE FUNCTION public.prevent_role_history_mutation();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_role_history_no_delete') THEN
    CREATE TRIGGER trg_role_history_no_delete BEFORE DELETE ON public.role_change_history FOR EACH ROW EXECUTE FUNCTION public.prevent_role_history_mutation();
  END IF;
END $$;

ALTER TABLE public.role_change_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='role_change_history' AND policyname='rch_select') THEN
    CREATE POLICY rch_select ON public.role_change_history FOR SELECT USING (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.organization_settings (
  organization_id UUID PRIMARY KEY REFERENCES public."Organizations"(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES public."Profiles"(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_settings' AND policyname='os_select') THEN
    CREATE POLICY os_select ON public.organization_settings FOR SELECT USING (organization_id IN (SELECT organization_id FROM public."Profiles" WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_settings' AND policyname='os_insert') THEN
    CREATE POLICY os_insert ON public.organization_settings FOR INSERT WITH CHECK (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='organization_settings' AND policyname='os_update') THEN
    CREATE POLICY os_update ON public.organization_settings FOR UPDATE USING (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin')) WITH CHECK (organization_id IN (SELECT organization_id FROM public."Profiles" p JOIN public."User_roles" ur ON ur.user_id = p.id JOIN public."Roles" r ON r.id = ur.role_id WHERE p.id = auth.uid() AND r.name='Organization Admin'));
  END IF;
END $$;

-- Archive audit
CREATE TABLE IF NOT EXISTS public.archive_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('archive','restore')),
  performed_by UUID NOT NULL REFERENCES public."Profiles"(id),
  performed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.archive_project(p_project_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.project_members pm JOIN public."Roles" r ON r.id=pm.role_id WHERE pm.user_id=auth.uid() AND pm.project_id=p_project_id AND r.name IN ('Project Manager','Organization Admin')) THEN
    RAISE EXCEPTION 'Not authorized to archive';
  END IF;
  UPDATE public.projects SET archived_at=NOW(), archived_by=auth.uid() WHERE id=p_project_id AND archived_at IS NULL;
  INSERT INTO public.archive_audit (table_name, record_id, action, performed_by) VALUES ('projects', p_project_id, 'archive', auth.uid());
END; $$;

CREATE OR REPLACE FUNCTION public.restore_project(p_project_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.project_members pm JOIN public."Roles" r ON r.id=pm.role_id WHERE pm.user_id=auth.uid() AND pm.project_id=p_project_id AND r.name IN ('Project Manager','Organization Admin')) THEN
    RAISE EXCEPTION 'Not authorized to restore';
  END IF;
  UPDATE public.projects SET archived_at=NULL, archived_by=NULL WHERE id=p_project_id AND archived_at IS NOT NULL;
  INSERT INTO public.archive_audit (table_name, record_id, action, performed_by) VALUES ('projects', p_project_id, 'restore', auth.uid());
END; $$;

REVOKE ALL ON FUNCTION public.archive_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.archive_project(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.restore_project(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_project(UUID) TO authenticated;

-- DMs
CREATE TABLE IF NOT EXISTS public.dm_conversations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS public.dm_participants (conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES public."Profiles"(id) ON DELETE CASCADE, joined_at TIMESTAMPTZ DEFAULT NOW(), PRIMARY KEY (conversation_id, user_id));
CREATE TABLE IF NOT EXISTS public.dm_messages (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE, sender_id UUID NOT NULL REFERENCES public."Profiles"(id), body TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW());

CREATE OR REPLACE FUNCTION public.enforce_dm_participants()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.dm_participants WHERE conversation_id = NEW.conversation_id) >= 2 THEN RAISE EXCEPTION 'Conversation already has two participants'; END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_dm_participants_limit') THEN
    CREATE TRIGGER trg_dm_participants_limit BEFORE INSERT ON public.dm_participants FOR EACH ROW EXECUTE FUNCTION public.enforce_dm_participants();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_dm_conversation(user_a UUID, user_b UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE conv_id UUID; lock_key BIGINT;
BEGIN
  IF user_a = user_b THEN RAISE EXCEPTION 'Cannot DM self'; END IF;
  IF auth.uid() IS DISTINCT FROM user_a AND auth.uid() IS DISTINCT FROM user_b THEN RAISE EXCEPTION 'Caller must be participant'; END IF;
  lock_key := hashtext(LEAST(user_a::text, user_b::text) || ':' || GREATEST(user_a::text, user_b::text));
  PERFORM pg_advisory_xact_lock(lock_key);
  SELECT c.id INTO conv_id
  FROM public.dm_conversations c
  WHERE EXISTS (SELECT 1 FROM public.dm_participants p WHERE p.conversation_id=c.id AND p.user_id=user_a)
    AND EXISTS (SELECT 1 FROM public.dm_participants p WHERE p.conversation_id=c.id AND p.user_id=user_b);
  IF conv_id IS NOT NULL THEN RETURN conv_id; END IF;
  INSERT INTO public.dm_conversations DEFAULT VALUES RETURNING id INTO conv_id;
  INSERT INTO public.dm_participants (conversation_id, user_id) VALUES (conv_id, user_a), (conv_id, user_b);
  RETURN conv_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_dm_conversation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dm_conversation(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_dm_participant(conv_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.dm_participants WHERE conversation_id = conv_id AND user_id = auth.uid());
$$;

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_conversations' AND policyname='dm_conv_select') THEN
    CREATE POLICY dm_conv_select ON public.dm_conversations FOR SELECT USING (public.is_dm_participant(id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_participants' AND policyname='dm_part_select') THEN
    CREATE POLICY dm_part_select ON public.dm_participants FOR SELECT USING (public.is_dm_participant(conversation_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_messages' AND policyname='dm_msg_select') THEN
    CREATE POLICY dm_msg_select ON public.dm_messages FOR SELECT USING (public.is_dm_participant(conversation_id));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='dm_messages' AND policyname='dm_msg_insert') THEN
    CREATE POLICY dm_msg_insert ON public.dm_messages FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_dm_participant(conversation_id));
  END IF;
END $$;

REVOKE UPDATE, DELETE ON public.dm_participants FROM authenticated, anon;
REVOKE UPDATE, DELETE ON public.dm_messages FROM authenticated, anon;
GRANT SELECT, INSERT ON public.dm_participants TO authenticated;
GRANT SELECT, INSERT ON public.dm_messages TO authenticated;


REVOKE ALL ON FUNCTION public.is_dm_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_dm_participant(UUID) TO authenticated;

-- Invitation acceptance (secure, server-side)
CREATE OR REPLACE FUNCTION public.accept_organization_invitation(p_token TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE inv RECORD; v_user_id UUID; v_email TEXT; v_org_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email, organization_id INTO v_email, v_org_id FROM public."Profiles" WHERE id = v_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'Profile or email missing'; END IF;

  SELECT * INTO inv FROM public.organization_invitations
  WHERE token_hash = encode(digest(p_token, 'sha256'), 'hex') AND status='pending' AND expires_at > NOW()
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or expired invitation'; END IF;
  IF inv.accepted_by IS NOT NULL THEN RAISE EXCEPTION 'Invitation already used'; END IF;
  IF lower(trim(v_email)) IS DISTINCT FROM inv.email_normalized THEN RAISE EXCEPTION 'Email mismatch'; END IF;
  IF v_org_id IS DISTINCT FROM inv.organization_id THEN RAISE EXCEPTION 'Organization mismatch'; END IF;

  INSERT INTO public."User_roles" (user_id, role_id) VALUES (v_user_id, inv.role_id) ON CONFLICT DO NOTHING;
  UPDATE public.organization_invitations SET status='accepted', accepted_at=NOW(), accepted_by=v_user_id WHERE id=inv.id;
  INSERT INTO public.role_change_history (organization_id, user_id, previous_role_id, new_role_id, changed_by, reason)
  VALUES (inv.organization_id, v_user_id, NULL, inv.role_id, v_user_id, 'Invitation accepted');
END; $$;

REVOKE ALL ON FUNCTION public.accept_organization_invitation(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(TEXT) TO authenticated;


-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('indicators','projects','project_members','Profiles','Roles','User_roles','Organizations') ORDER BY table_name, ordinal_position;
-- SELECT table_name, constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_schema='public' AND table_name IN ('indicators','projects','project_members','Profiles','Roles','User_roles','Organizations');
-- SELECT tgname, tgrelid::regclass, pg_get_functiondef(tgfoid) FROM pg_trigger WHERE tgrelid IN ('public.indicators'::regclass,'public.projects'::regclass,'public.project_members'::regclass);
-- SELECT proname, pg_get_functiondef(oid) FROM pg_proc WHERE pronamespace='public'::regnamespace;
-- SELECT r.name, COUNT(*) AS count FROM public.project_members pm JOIN public."Roles" r ON r.id = pm.role_id GROUP BY r.name ORDER BY r.name;
```

This migration file is at `supabase/migrations/009_me_hr_archive_dm.sql`. It has not been executed. No other candidate files.<|end|><|start|>user<|channel|>Locate the consolidated Shanji migration SQL file you just created. Search the entire repository, including `supabase/migrations` and any recovery or implementation folders.

Do not create another migration or modify anything.

Return:
1. The exact filename.
2. Its full repository path.
3. Confirm that it contains the M&E, HR/Admin, Archive and DM changes.
4. Confirm that it has not been executed against Supabase.

If multiple candidate files exist, identify the newest one and list the others so we don't use the wrong migration.


<environment_details>
Message time: 2026-11-02T13:39:40Z
Working directory: /workspaces/Shanji/.kilo/worktrees/radical-clematis
Workspace root folder: /workspaces/Shanji/.kilo/worktrees/radical-clematis
</environment_details><|end|><|start|>advisor<|channel|>analysis<|message|>We need answer location. File created at supabase/migrations/009_me_hr_archive_dm.sql. Confirm contains M&E HR archive DM. Not executed. Also there is shanji-frontend/supabase/migrations (old copies) but no 009 there. Need list candidates. The user asks search entire repo. We can run find.<|end|><|start|>advisor to=bash<|channel|>analysis <|constrain|>xml<|message|><rfl:parameter name="command">
cd /workspaces/Shanji/.kilo/worktrees/radical-clematis && find . -name "009_me_hr_archive_dm.sql" -o -name "*me_hr*" 2>/dev/null; echo "---"; ls -la supabase/migrations/009*