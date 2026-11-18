import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { BUCKET, db } from '@/lib/supabase';
import type { StoredMedia } from '@/lib/types';

const FORMATS = ['image', 'carousel', 'video'];

// Only keep real web links (blocks javascript: and similar).
function cleanUrl(v: unknown) {
  const s = String(v || '').trim();
  if (!s) return null;
  const withProto = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withProto);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

// Create (no id) or update (with id) a post.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const supa = db();

  const fields: Record<string, unknown> = {
    post_date: body.post_date,
    format: FORMATS.includes(body.format) ? body.format : 'image',
    caption: String(body.caption || ''),
    posted: !!body.posted,
    post_url: body.posted ? cleanUrl(body.post_url) : null,
    cover_path: typeof body.cover_path === 'string' && body.cover_path ? body.cover_path : null,
    video_url: cleanUrl(body.video_url),
    updated_at: new Date().toISOString(),
  };

  if (body.id) {
    const { data: current, error: e1 } = await supa.from('mural_posts').select('*').eq('id', body.id).single();
    if (e1 || !current) return NextResponse.json({ error: 'post não encontrado' }, { status: 404 });
    if (Array.isArray(body.media)) {
      const keep = new Set((body.media as StoredMedia[]).map((m) => m.path));
      const removed = (current.media as StoredMedia[]).filter((m) => !keep.has(m.path)).map((m) => m.path);
      if (removed.length) await supa.storage.from(BUCKET).remove(removed);
      fields.media = body.media;
    }
    // Old cover replaced or removed: delete the file unless it is also one of the post's media files.
    const mediaPaths = new Set(((fields.media as StoredMedia[]) || current.media || []).map((m: StoredMedia) => m.path));
    if (current.cover_path && current.cover_path !== fields.cover_path && !mediaPaths.has(current.cover_path)) {
      await supa.storage.from(BUCKET).remove([current.cover_path]);
    }
    // New version goes back to the client for review; previous comment stays visible.
    if (body.resubmit && !body.posted) {
      fields.status = 'pending';
      fields.revision = (current.revision || 1) + 1;
      fields.reviewed_at = null;
    }
    const { error } = await supa.from('mural_posts').update(fields).eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  fields.client_id = body.clientId;
  fields.media = Array.isArray(body.media) ? body.media : [];
  const { error } = await supa.from('mural_posts').insert(fields);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await req.json();
  const supa = db();
  const { data } = await supa.from('mural_posts').select('media, cover_path').eq('id', id).single();
  const paths = ((data?.media || []) as StoredMedia[]).map((m) => m.path);
  if (data?.cover_path) paths.push(data.cover_path);
  if (paths.length) await supa.storage.from(BUCKET).remove(paths);
  const { error } = await supa.from('mural_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
