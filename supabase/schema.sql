-- LawCA optional Supabase schema. The dashboard works WITHOUT this (static JSON + localStorage).
-- Run in Supabase SQL editor. Public (anon) role is READ-ONLY on content tables; writes come from the
-- GitHub Action using the service-role key (stored as a GitHub Secret, never in the repo or the browser).

create table if not exists sources (
  name text primary key,
  quality int not null check (quality between 1 and 10),
  url text
);

create table if not exists topics (
  slug text primary key,
  label text not null
);

create table if not exists articles (
  id text primary key,
  title text not null,
  summary text,
  content text,
  source text,
  source_url text,
  sources jsonb not null default '[]',
  published_at timestamptz not null,
  category text,
  subcategory text,
  relevance_score int check (relevance_score between 1 and 10),
  nlsat_relevance int, aiat_relevance int, ssc_relevance int,
  tags text[] default '{}',
  priority_score numeric,
  why_matters text,
  key_facts jsonb,
  verified boolean default false,
  ai_generated boolean default false,
  is_demo boolean default false,
  created_at timestamptz default now()
);
create index if not exists articles_pub_idx on articles (published_at desc);
create index if not exists articles_cat_idx on articles (category);
create index if not exists articles_fts_idx on articles using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'')));

create table if not exists questions (
  id text primary key,
  article_id text references articles(id) on delete set null,
  question text not null,
  option_a text not null, option_b text not null, option_c text not null, option_d text not null,
  answer char(1) not null check (answer in ('A','B','C','D')),
  explanation text,
  difficulty text check (difficulty in ('easy','medium','hard')),
  created_at timestamptz default now()
);

-- Per-user tables (only needed if you later add Supabase Auth; the app currently keeps these on-device).
create table if not exists users (id uuid primary key references auth.users(id) on delete cascade, exam_target text, created_at timestamptz default now());
create table if not exists bookmarks (user_id uuid references users(id) on delete cascade, article_id text references articles(id) on delete cascade, created_at timestamptz default now(), primary key (user_id, article_id));
create table if not exists revision_items (user_id uuid references users(id) on delete cascade, article_id text references articles(id) on delete cascade, learned_on date not null, stage int not null default 0, next_due date not null, primary key (user_id, article_id));
create table if not exists quiz_attempts (id bigint generated always as identity primary key, user_id uuid references users(id) on delete cascade, kind text, total int, correct int, wrong int, skipped int, score numeric, taken_at timestamptz default now());

alter table sources enable row level security;
alter table topics enable row level security;
alter table articles enable row level security;
alter table questions enable row level security;
alter table users enable row level security;
alter table bookmarks enable row level security;
alter table revision_items enable row level security;
alter table quiz_attempts enable row level security;

create policy "public read sources" on sources for select using (true);
create policy "public read topics" on topics for select using (true);
create policy "public read articles" on articles for select using (true);
create policy "public read questions" on questions for select using (true);
create policy "own profile" on users for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "own bookmarks" on bookmarks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own revision" on revision_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own attempts" on quiz_attempts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- No insert/update/delete policies on content tables for anon: only the service-role key (bypasses RLS) can write.
