import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import AdminBoard from '@/components/AdminBoard';
import { isAdmin } from '@/lib/auth';
import { getPosts } from '@/lib/posts';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function ClientAdmin({ params }: { params: Promise<{ clientId: string }> }) {
  if (!(await isAdmin())) redirect('/admin/login');
  const { clientId } = await params;
  const { data: client } = await db().from('mural_clients').select('*').eq('id', clientId).single();
  if (!client) notFound();

  const posts = await getPosts(client.id);
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const proto = h.get('x-forwarded-proto') || 'https';
  const shareUrl = `${proto}://${host}/c/${client.token}`;

  return (
    <main className="wrap">
      <header className="topbar">
        <div>
          <Link href="/admin" className="muted small">← Clientes</Link>
          <h1>{client.name}</h1>
        </div>
        <form method="post" action="/api/admin/clients">
          <input type="hidden" name="action" value="delete" />
          <input type="hidden" name="id" value={client.id} />
          <button className="btn ghost danger" title="Apaga o cliente, os posts e os arquivos">Excluir cliente</button>
        </form>
      </header>
      <AdminBoard clientId={client.id} shareUrl={shareUrl} posts={posts} />
    </main>
  );
}
