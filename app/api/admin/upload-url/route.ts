import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { BUCKET, db } from '@/lib/supabase';

// Returns a signed upload URL so the browser sends the file straight to Supabase
// (Vercel caps request bodies at ~4.5 MB, too small for videos).
export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { clientId, filename } = await req.json();
  const ext = (String(filename).split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${clientId}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: data.path, token: data.token });
}
