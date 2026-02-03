-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Users Table (already exists, but adding profile fields)
-- If you already have users table, run ALTER instead
alter table users add column if not exists avatar_url text;
alter table users add column if not exists bio text;

-- 2. Posts Table
create table if not exists posts (
  id uuid default gen_random_uuid() primary key,
  author_username text not null references users(username),
  content text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Likes Table
create table if not exists likes (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references posts(id) on delete cascade,
  username text not null references users(username),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(post_id, username)
);

-- 4. Comments Table
create table if not exists comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid not null references posts(id) on delete cascade,
  author_username text not null references users(username),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Stories Table
create table if not exists stories (
  id uuid default gen_random_uuid() primary key,
  author_username text not null references users(username),
  image_url text,
  text_content text,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Enable Realtime
alter publication supabase_realtime add table posts;
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table likes;
