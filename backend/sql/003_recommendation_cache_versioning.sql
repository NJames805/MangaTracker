-- Adds model/prompt versioning to the existing recommendation_cache table so
-- that changing the recommendation prompt or switching models invalidates old
-- cached rows instead of silently serving stale recommendations forever.
alter table recommendation_cache
  add column if not exists model text not null default 'claude-opus-5',
  add column if not exists prompt_version text not null default 'v1';

-- The upsert in cache.ts needs an explicit conflict target - id (the existing
-- primary key) is a fresh random uuid on every insert, so it would never
-- actually collide. This is the real lookup/uniqueness key for a cache entry.
alter table recommendation_cache
  add constraint recommendation_cache_lookup_key unique (library_hash, model, prompt_version);
