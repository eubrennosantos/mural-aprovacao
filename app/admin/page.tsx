import Link from 'next/link';
import { redirect } from 'next/navigation';
import ThemeToggle from '@/components/ThemeToggle';
import { isAdmin } from '@/lib/auth';
import { db } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function Admin() {
  if (!(await isAdmin())) redirect('/admin/login');
  const supa = db();
  const [{ data: clients }, { data: posts }] = await Promise.all([
    supa.from('mural_clients').select('id, name, created_at').order('created_at', { ascending: false }),
    supa.from('mural_posts').select('client_id, status, posted'),
  ]);

  const counts: Record<string, { pending: number; approved: number; changes: number; posted: number }> = {};
  for (const p of posts || []) {
    counts[p.client_id] ??= { pending: 0, approved: 0, changes: 0, posted: 0 };
    counts[p.client_id][(p.posted ? 'posted' : p.status) as 'pending']++;
  }

  return (
    <main className="wrap">
      <header className="topbar">
        <div>
          <div className="brand">B.S REC</div>
          <h1>Clientes</h1>
        </div>
        <div className="row-tight" style={{ alignItems: 'center' }}>
          <ThemeToggle label="Tema escuro" />
        <form method="post" action="/api/admin/logout">
          <button className="btn ghost">Sair</button>
        </form>
        </div>
      </header>

      <form className="panel row" method="post" action="/api/admin/clients">
        <input name="name" placeholder="Nome do cliente (ex.: Orca Web Solutions)" required />
        <button className="btn primary">Criar mural</button>
      </form>

      <div className="list">
        {(clients || []).map((c) => {
          const n = counts[c.id] || { pending: 0, approved: 0, changes: 0, posted: 0 };
          return (
            <Link key={c.id} href={`/admin/${c.id}`} className="panel client-row">
              <strong>{c.name}</strong>
              <span className="chips">
                <span className="chip pending">{n.pending} pendentes</span>
                <span className="chip changes">{n.changes} ajustes</span>
                <span className="chip approved">{n.approved} aprovados</span>
                <span className="chip posted">{n.posted} postados</span>
              </span>
            </Link>
          );
        })}
        {!clients?.length && <p className="muted">Nenhum cliente ainda. Crie o primeiro mural acima.</p>}
      </div>
    </main>
  );
}
