create table if not exists manga_library (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  manga_id text not null,
  title text not null,
  description text,
  cover_url text,
  genres text[] not null default '{}',
  manga_status text not null,
  year integer,
  reading_status text not null default 'reading' check (reading_status in ('reading', 'completed', 'dropped')),
  chapters_read integer not null default 0,
  volumes_read integer not null default 0,
  date_added timestamptz not null default now(),
  last_updated timestamptz not null default now(),
  unique (user_id, manga_id)
);

alter table manga_library enable row level security;

create policy "Users can view their own library"
  on manga_library for select
  using (auth.uid() = user_id);

create policy "Users can insert into their own library"
  on manga_library for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own library"
  on manga_library for update
  using (auth.uid() = user_id);

create policy "Users can delete their own library"
  on manga_library for delete
  using (auth.uid() = user_id);
