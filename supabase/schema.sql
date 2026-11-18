-- Mural de aprovação — rode este arquivo inteiro no SQL Editor do Supabase.
-- As tabelas têm prefixo "mural_" para não misturar com as do Foto do Evento.

create table if not exists mural_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists mural_posts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references mural_clients(id) on delete cascade,
  post_date date not null,
  format text not null default 'image' check (format in ('image', 'carousel', 'video')),
  media jsonb not null default '[]'::jsonb,
  caption text not null default '',
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes')),
  client_comment text,
  revision int not null default 1,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists mural_posts_client_date on mural_posts (client_id, post_date);

-- RLS ligado e sem políticas: ninguém acessa direto pelo navegador.
-- O site fala com o banco só pelo servidor (service role key).
alter table mural_clients enable row level security;
alter table mural_posts enable row level security;

-- Bucket público para as artes e vídeos (os nomes dos arquivos são aleatórios).
insert into storage.buckets (id, name, public)
values ('mural', 'mural', true)
on conflict (id) do nothing;

-- v2: marcação "Postado" + link do post
alter table mural_posts add column if not exists posted boolean not null default false;
alter table mural_posts add column if not exists post_url text;
