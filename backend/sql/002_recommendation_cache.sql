create table if not exists recommendation_cache (
  library_hash text not null,
  prompt_version text not null,
  model text not null,
  recommendations jsonb not null,
  created_at timestamptz not null default now(),
  primary key (library_hash, prompt_version, model)
);

-- Only the backend (service role) touches this table. Enabling RLS with no
-- policies means anon/authenticated keys cannot read or write it at all.
alter table recommendation_cache enable row level security;
