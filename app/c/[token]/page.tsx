import { notFound } from 'next/navigation';
import ClientBoard from '@/components/ClientBoard';
import { getPosts } from '@/lib/posts';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function ClientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: client } = await db().from('mural_clients').select('id, name').eq('token', token).single();
  if (!client) notFound();
  const posts = await getPosts(client.id);
  return <ClientBoard token={token} clientName={client.name} initialPosts={posts} />;
}
