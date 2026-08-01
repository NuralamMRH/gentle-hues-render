-- ============ enums ============
CREATE TYPE public.app_role AS ENUM ('admin','moderator','user');
CREATE TYPE public.submission_status AS ENUM ('draft','pending','approved','rejected','suspended');
CREATE TYPE public.subscription_status AS ENUM ('inactive','trialing','active','past_due','canceled','incomplete');

-- ============ shared trigger fn ============
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ profiles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  display_name text,
  avatar_url text,
  company text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ roles ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- ============ signup trigger ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(COALESCE(NEW.email,''),'@',1)),
    NEW.raw_user_meta_data->>'avatar_url'
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan_code, status, current_period_start, current_period_end)
  VALUES (NEW.id, 'free', 'active', date_trunc('month', now()), date_trunc('month', now()) + interval '1 month')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END; $$;

-- ============ plans ============
CREATE TABLE public.plans (
  code text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'usd',
  interval text NOT NULL DEFAULT 'month',
  monthly_token_allowance bigint NOT NULL DEFAULT 0,
  max_submissions integer NOT NULL DEFAULT 1,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  stripe_price_id text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_public_read" ON public.plans FOR SELECT TO anon, authenticated USING (is_active);
CREATE TRIGGER plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.plans (code, name, description, price_cents, monthly_token_allowance, max_submissions, features, sort_order) VALUES
('free','Free','Explore the network and test your own AI.',0,100000,1,'["100K tokens / month","1 AI submission","Community support"]'::jsonb,1),
('pro','Pro','For builders shipping real workloads.',2000,5000000,10,'["5M tokens / month","10 AI submissions","Usage analytics","Priority routing"]'::jsonb,2),
('max','Max','Maximum throughput for heavy usage.',10000,30000000,100,'["30M tokens / month","Unlimited-scale submissions","Dedicated routing","Priority support"]'::jsonb,3);

-- ============ subscriptions ============
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_code text NOT NULL REFERENCES public.plans(code) DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ai listings ============
CREATE TABLE public.ai_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  tagline text,
  description text,
  category text,
  tags text[] NOT NULL DEFAULT '{}',
  model_name text,
  context_length integer,
  endpoint_url text NOT NULL,
  auth_header_ciphertext text,
  price_per_million_tokens_cents integer NOT NULL DEFAULT 0,
  status public.submission_status NOT NULL DEFAULT 'pending',
  is_public boolean NOT NULL DEFAULT true,
  is_online boolean NOT NULL DEFAULT false,
  last_heartbeat_at timestamptz,
  review_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_listings_owner_idx ON public.ai_listings(owner_id);
CREATE INDEX ai_listings_status_idx ON public.ai_listings(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_listings TO authenticated;
GRANT SELECT ON public.ai_listings TO anon;
GRANT ALL ON public.ai_listings TO service_role;
ALTER TABLE public.ai_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_listings_public_read" ON public.ai_listings FOR SELECT TO anon, authenticated USING (status = 'approved' AND is_public);
CREATE POLICY "ai_listings_owner_read" ON public.ai_listings FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "ai_listings_admin_read" ON public.ai_listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ai_listings_owner_insert" ON public.ai_listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ai_listings_owner_update" ON public.ai_listings FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "ai_listings_admin_update" ON public.ai_listings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "ai_listings_owner_delete" ON public.ai_listings FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE TRIGGER ai_listings_updated_at BEFORE UPDATE ON public.ai_listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ api keys ============
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Default key',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_user_idx ON public.api_keys(user_id);
GRANT SELECT, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_select_own" ON public.api_keys FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "api_keys_delete_own" ON public.api_keys FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ token usage ============
CREATE TABLE public.token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid REFERENCES public.ai_listings(id) ON DELETE SET NULL,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  cost_cents numeric(12,4) NOT NULL DEFAULT 0,
  latency_ms integer,
  status_code integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX token_usage_user_created_idx ON public.token_usage(user_id, created_at DESC);
CREATE INDEX token_usage_listing_idx ON public.token_usage(listing_id);
GRANT SELECT ON public.token_usage TO authenticated;
GRANT ALL ON public.token_usage TO service_role;
ALTER TABLE public.token_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "token_usage_select_own" ON public.token_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "token_usage_owner_of_listing" ON public.token_usage FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ai_listings l WHERE l.id = token_usage.listing_id AND l.owner_id = auth.uid()));

-- ============ monthly rollup ============
CREATE TABLE public.usage_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  tokens_used bigint NOT NULL DEFAULT 0,
  requests integer NOT NULL DEFAULT 0,
  cost_cents numeric(12,4) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);
GRANT SELECT ON public.usage_periods TO authenticated;
GRANT ALL ON public.usage_periods TO service_role;
ALTER TABLE public.usage_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usage_periods_select_own" ON public.usage_periods FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.rollup_token_usage()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.usage_periods (user_id, period_start, tokens_used, requests, cost_cents)
  VALUES (NEW.user_id, date_trunc('month', NEW.created_at)::date, NEW.total_tokens, 1, NEW.cost_cents)
  ON CONFLICT (user_id, period_start) DO UPDATE SET
    tokens_used = public.usage_periods.tokens_used + EXCLUDED.tokens_used,
    requests = public.usage_periods.requests + 1,
    cost_cents = public.usage_periods.cost_cents + EXCLUDED.cost_cents,
    updated_at = now();
  RETURN NEW;
END; $$;
CREATE TRIGGER token_usage_rollup AFTER INSERT ON public.token_usage FOR EACH ROW EXECUTE FUNCTION public.rollup_token_usage();