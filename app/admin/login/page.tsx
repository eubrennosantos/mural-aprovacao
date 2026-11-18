import ThemeToggle from '@/components/ThemeToggle';

export default async function Login({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const { e } = await searchParams;
  return (
    <main className="center">
      <form className="panel login" method="post" action="/api/admin/login">
        <div className="row-between">
          <div className="brand">B.S REC</div>
          <ThemeToggle label="Tema escuro" />
        </div>
        <h1>Painel do mural</h1>
        <input type="password" name="password" placeholder="Senha" autoFocus required />
        {e && <p className="error">Senha incorreta.</p>}
        <button className="btn primary" type="submit">Entrar</button>
      </form>
    </main>
  );
}
