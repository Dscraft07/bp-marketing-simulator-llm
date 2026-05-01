-- ============================================================================
--   Init migration — kompletní DB schéma prediktivního simulátoru
--
--   Tabulky:  profiles, campaigns, target_groups, simulations,
--             simulation_results, user_api_keys
--   Enum typy: sentiment_label, simulation_status
--   RLS:      zapnuto pro všechny tabulky, izolace podle auth.uid()
--   Trigger:  auto-create profilu po registraci (auth.users → profiles)
-- ============================================================================

-- ---------- ENUM TYPES -----------------------------------------------------

CREATE TYPE public.sentiment_label AS ENUM (
  'positive',
  'neutral',
  'negative'
);

CREATE TYPE public.simulation_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed'
);

-- ---------- TABLE: profiles ------------------------------------------------

CREATE TABLE public.profiles (
  id          uuid NOT NULL,
  username    text UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey    PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ---------- TABLE: campaigns -----------------------------------------------

CREATE TABLE public.campaigns (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL DEFAULT auth.uid(),
  name            text NOT NULL,
  content         text NOT NULL,
  social_platform text NOT NULL DEFAULT 'twitter'
                  CHECK (social_platform IN ('twitter','facebook','instagram','linkedin','tiktok')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT campaigns_pkey         PRIMARY KEY (id),
  CONSTRAINT campaigns_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_select_own" ON public.campaigns
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "campaigns_insert_own" ON public.campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns_update_own" ON public.campaigns
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "campaigns_delete_own" ON public.campaigns
  FOR DELETE USING (user_id = auth.uid());

-- ---------- TABLE: target_groups -------------------------------------------

CREATE TABLE public.target_groups (
  id            uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid(),
  name          text NOT NULL,
  description   text NOT NULL,
  persona_count smallint NOT NULL DEFAULT 5
                CHECK (persona_count >= 1 AND persona_count <= 100),
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT target_groups_pkey         PRIMARY KEY (id),
  CONSTRAINT target_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

ALTER TABLE public.target_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "target_groups_select_own" ON public.target_groups
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "target_groups_insert_own" ON public.target_groups
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "target_groups_update_own" ON public.target_groups
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "target_groups_delete_own" ON public.target_groups
  FOR DELETE USING (user_id = auth.uid());

-- ---------- TABLE: simulations ---------------------------------------------

CREATE TABLE public.simulations (
  id                    uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL DEFAULT auth.uid(),
  campaign_id           uuid,
  target_group_id       uuid,
  campaign_snapshot     jsonb,
  target_group_snapshot jsonb,
  summary               text,
  status                simulation_status NOT NULL DEFAULT 'pending',
  model                 text,
  temperature           real CHECK (temperature IS NULL OR (temperature >= 0 AND temperature <= 2)),
  prompt_version        smallint NOT NULL DEFAULT 1,
  error_message         text,
  finished_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulations_pkey                  PRIMARY KEY (id),
  CONSTRAINT simulations_user_id_fkey          FOREIGN KEY (user_id)         REFERENCES public.profiles(id)      ON DELETE CASCADE,
  CONSTRAINT simulations_campaign_id_fkey      FOREIGN KEY (campaign_id)     REFERENCES public.campaigns(id)     ON DELETE SET NULL,
  CONSTRAINT simulations_target_group_id_fkey  FOREIGN KEY (target_group_id) REFERENCES public.target_groups(id) ON DELETE SET NULL
);

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulations_select_own" ON public.simulations
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "simulations_insert_own" ON public.simulations
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "simulations_update_own" ON public.simulations
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "simulations_delete_own" ON public.simulations
  FOR DELETE USING (user_id = auth.uid());

-- ---------- TABLE: simulation_results --------------------------------------

CREATE TABLE public.simulation_results (
  id              uuid NOT NULL DEFAULT gen_random_uuid(),
  simulation_id   uuid NOT NULL,
  persona_name    text NOT NULL,
  content         text NOT NULL,
  sentiment       sentiment_label,
  relevance_score real             CHECK (relevance_score IS NULL OR (relevance_score >= 0 AND relevance_score <= 1)),
  toxicity_score  real             CHECK (toxicity_score  IS NULL OR (toxicity_score  >= 0 AND toxicity_score  <= 1)),
  purchase_intent double precision CHECK (purchase_intent IS NULL OR (purchase_intent >= 0 AND purchase_intent <= 1)),
  diversity_score double precision CHECK (diversity_score IS NULL OR (diversity_score >= 0 AND diversity_score <= 1)),
  content_tsv     tsvector DEFAULT to_tsvector('simple'::regconfig, COALESCE(content, '')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT simulation_results_pkey                PRIMARY KEY (id),
  CONSTRAINT simulation_results_simulation_id_fkey  FOREIGN KEY (simulation_id) REFERENCES public.simulations(id) ON DELETE CASCADE
);

ALTER TABLE public.simulation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "simulation_results_select_via_owner" ON public.simulation_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.simulations s
      WHERE s.id = simulation_id AND s.user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE provádí výhradně Edge Function se service-role klíčem,
-- který RLS obchází (bypass RLS). Veřejné role (anon, authenticated) tedy
-- pro tyto operace politiky nedefinujeme — výchozí chování je odepření.

-- ---------- TABLE: user_api_keys -------------------------------------------

CREATE TABLE public.user_api_keys (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL,
  provider    text NOT NULL,
  api_key     text NOT NULL,
  key_hint    text NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  CONSTRAINT user_api_keys_pkey                PRIMARY KEY (id),
  CONSTRAINT user_api_keys_user_id_fkey        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_api_keys_user_provider_uniq  UNIQUE (user_id, provider)
);

ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_api_keys_select_own" ON public.user_api_keys
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_api_keys_insert_own" ON public.user_api_keys
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_api_keys_update_own" ON public.user_api_keys
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_api_keys_delete_own" ON public.user_api_keys
  FOR DELETE USING (user_id = auth.uid());

-- ---------- TRIGGER: auto-create profile po registraci ---------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
