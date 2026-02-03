-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create Users Table (Public Keys)
create table users (
  id uuid default gen_random_uuid() primary key,
  username text unique not null,
  public_key text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create Messages Table
create table messages (
  id uuid default gen_random_uuid() primary key,
  sender_username text not null,
  receiver_username text not null,
  nonce text not null,
  ciphertext text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Enable Realtime
alter publication supabase_realtime add table messages;
