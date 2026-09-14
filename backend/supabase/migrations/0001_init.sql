-- Core schema: one plan per user, shared verbatim by the web dashboard and the extension so
-- neither is ever a second source of truth (Section 5 of the funnel spec). Field names mirror
-- the extension's TaperPlanState/BlocklistEntry/PendingPlanChange shapes (see
-- extension/src/shared/types.ts) so the sync layer is a near-direct mapping, not a translation.

create table public.plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  goal_id text,
  enabled boolean not null default true,
  pace_tier text not null default 'moderate' check (pace_tier in ('gentle', 'moderate', 'aggressive')),
  mode text not null default 'percentage' check (mode in ('percentage', 'linear')),
  linear_daily_reduction_minutes int not null default 10,
  floor_minutes int not null default 25,
  full_elimination boolean not null default false,
  min_taper_threshold_minutes int not null default 10,
  plan_start_date date not null default current_date,
  worst_offender_site_id uuid,
  worst_offender_schedule jsonb,
  reconciled_at date,
  devices text[] not null default '{}',
  -- {effectiveDate, changes, baselineChanges} — the ratchet's staged next-midnight change
  -- (Section 2.3 of the original spec), same shape the extension already stores locally.
  pending_change jsonb,
  updated_at timestamptz not null default now()
);

create table public.plan_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  domain text not null,
  category text not null,
  baseline_minutes int not null,
  added_at timestamptz not null default now(),
  unique (user_id, domain)
);

alter table public.plans
  add constraint plans_worst_offender_site_fk
  foreign key (worst_offender_site_id) references public.plan_sites(id) on delete set null;

-- Stripe billing state (Section 4) — kept separate from `plans` since it's written by the
-- webhook handler, not by the user, and has a different lifecycle.
create table public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null default 'none'
    check (status in ('none', 'trialing', 'active', 'past_due', 'canceled')),
  price_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
alter table public.plan_sites enable row level security;
alter table public.subscriptions enable row level security;

-- Every table: a user reads and writes only their own row(s). The Stripe webhook handler runs
-- with the service-role key, which bypasses RLS entirely, so it doesn't need its own policy.
create policy "own plan" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own plan sites" on public.plan_sites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own subscription read" on public.subscriptions
  for select using (auth.uid() = user_id);
