import { NextResponse } from 'next/server';
import { db } from '@/lib/supabase';

// Called by the client's board. The secret link token is the only credential.
export async function POST(req: Request) {
  const { token, postId, decision, comment } = await req.json();
  if (!['approved', 'changes', 'pending'].includes(decision)) {
    return NextResponse.json({ error: 'invalid decision' }, { status: 400 });
  }
  const supa = db();
  const { data: client } = await supa.from('mural_clients').select('id').eq('token', String(token || '')).single();
  if (!client) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const update: Record<string, unknown> = {
    status: decision,
    reviewed_at: decision === 'pending' ? null : new Date().toISOString(),
  };
  if (decision === 'changes') update.client_comment = String(comment || '').slice(0, 4000);

  const { data, error } = await supa
    .from('mural_posts')
    .update(update)
    .eq('id', postId)
    .eq('client_id', client.id)
    .eq('posted', false)
    .select('status, client_comment, reviewed_at')
    .single();
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
