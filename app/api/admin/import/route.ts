import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { BUCKET, db } from '@/lib/supabase';

const FORMATS = ['image', 'carousel', 'video'];

// Imports one post (with a small cover image, < 4 MB) in a single request.
// Used by the import script. Skips posts that already exist for that client
// (same date + same caption), so running the import twice is safe.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const form = await req.formData();
  const clientId = String(form.get('clientId') || '');
  const post_date = String(form.get('post_date') || '');
  const caption = String(form.get('caption') || '');
  const format = FORMATS.includes(String(form.get('format'))) ? String(form.get('format')) : 'video';
  const posted = String(form.get('posted')) === 'true';
  const rawUrl = String(form.get('post_url') || '').trim();
  const post_url = /^https:\/\/(www\.)?instagram\.com\//i.test(rawUrl) ? rawUrl : null;
  const file = form.get('file');

  if (!clientId || !/^\d{4}-\d{2}-\d{2}$/.test(post_date)) {
    return NextResponse.json({ error: 'dados inválidos' }, { status: 400 });
  }

  const supa = db();
  const { data: dup } = await supa
    .from('mural_posts')
    .select('id')
    .eq('client_id', clientId)
    .eq('post_date', post_date)
    .eq('caption', caption)
    .limit(1);
  if (dup && dup.length) return NextResponse.json({ ok: true, skipped: true });

  const media: { path: string; type: 'image' | 'video' }[] = [];
  let cover_path: string | null = null;
  if (file && typeof file !== 'string') {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supa.storage
      .from(BUCKET)
      .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type || 'image/jpeg' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((file.type || '').startsWith('video')) media.push({ path, type: 'video' });
    else cover_path = path; // imported images are the post's cover
  }

  const { error } = await supa.from('mural_posts').insert({
    client_id: clientId,
    post_date,
    format,
    caption,
    media,
    cover_path,
    posted,
    post_url: posted ? post_url : null,
    status: posted ? 'approved' : 'pending',
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
