import { db, publicUrl } from './supabase';
import type { Post, StoredMedia } from './types';

export async function getPosts(clientId: string): Promise<Post[]> {
  const { data, error } = await db()
    .from('mural_posts')
    .select('*')
    .eq('client_id', clientId)
    .order('post_date', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data || []).map((p) => ({
    ...p,
    media: ((p.media || []) as StoredMedia[]).map((m) => ({ ...m, url: publicUrl(m.path) })),
  }));
}
