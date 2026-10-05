-- The original table had UNIQUE (library_hash), meaning one cache row per
-- library. Migration 003 made the real key (library_hash, model,
-- prompt_version) so a prompt or model change gets its own row - but the old
-- constraint was left in place, so writing a v2 row for a library that already
-- had a v1 row failed, and that library was never cached again.
alter table recommendation_cache
  drop constraint if exists recommendation_cache_library_hash_key;
