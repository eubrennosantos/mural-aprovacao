import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { BUCKET, db } from '@/lib/supabase';

// Form post from /admin: create or delete a client.
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.redirect(new URL('/admin/login', req.url), 303);
  const form = await req.formData();
  const action = String(form.get('action') || 'create');
  const supa = db();

  if (action === 'delete') {
    const id = String(form.get('id') || '');
    const { data: posts } = await supa.from('mural_posts').select('media, cover_path').eq('client_id', id);
    const paths = (posts || []).flatMap((p) => [...(p.media || []).map((m: { path: string }) => m.path), ...(p.cover_path ? [p.cover_path] : [])]);
    if (paths.length) await supa.storage.from(BUCKET).remove(paths);
    await supa.from('mural_clients').delete().eq('id', id);
    return NextResponse.redirect(new URL('/admin', req.url), 303);
  }

  const name = String(form.get('name') || '').trim();
  if (!name) return NextResponse.redirect(new URL('/admin', req.url), 303);
  const token = crypto.randomBytes(18).toString('base64url');
  const { data, error } = await supa.from('mural_clients').insert({ name, token }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.redirect(new URL(`/admin/${data.id}`, req.url), 303);
}
