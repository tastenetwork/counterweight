-- Counterweight Assessment schema. RLS is ON with no policies on purpose:
-- only the edge function (service role) reads and writes; the anon key can do nothing.
create table if not exists public.cw_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) between 3 and 254),
  kind text not null check (kind in ('leader','candidate','team')),
  axes jsonb,
  style jsonb,
  cog jsonb,
  needs jsonb,
  video_url text,
  stage text not null default 'scored',
  leader_id uuid,
  five_year text,
  notes text,
  scorecard jsonb,
  source text not null default 'web',
  user_agent text
);
alter table public.cw_responses enable row level security;
create index if not exists cw_responses_created_idx on public.cw_responses (created_at desc);
create index if not exists cw_responses_leader_idx on public.cw_responses (leader_id);

create table if not exists public.cw_settings (
  id text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.cw_settings enable row level security;
