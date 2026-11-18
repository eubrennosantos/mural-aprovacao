'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import MediaViewer from './MediaViewer';
import { formatDate, viewOf, type Format, type Post, type StoredMedia, type ViewMedia } from '@/lib/types';

const STATUS_PT = { pending: 'Pendente', approved: 'Aprovado', changes: 'Pediu ajuste', posted: 'Postado' };
const FORMAT_PT = { image: 'Imagem', carousel: 'Carrossel', video: 'Vídeo' };
const MAX_MB = 50; // limite por arquivo do plano free do Supabase

const browserSupa = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AdminBoard({ clientId, shareUrl, posts }: { clientId: string; shareUrl: string; posts: Post[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Post | 'new' | null>(null);
  const [copied, setCopied] = useState(false);

  async function remove(p: Post) {
    if (!confirm(`Excluir o post de ${formatDate(p.post_date, 'pt-BR', { day: '2-digit', month: '2-digit' })}? Os arquivos também serão apagados.`)) return;
    await fetch('/api/admin/posts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    router.refresh();
  }

  return (
    <>
      <div className="panel share">
        <div>
          <div className="small muted">Link do cliente (mande só pra ele)</div>
          <code>{shareUrl}</code>
        </div>
        <div className="row-tight">
          <button className="btn" onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <a className="btn ghost" href={shareUrl} target="_blank">Ver como cliente</a>
        </div>
      </div>

      {editing ? (
        <PostForm
          clientId={clientId}
          post={editing === 'new' ? null : editing}
          onDone={() => { setEditing(null); router.refresh(); }}
          onCancel={() => setEditing(null)}
        />
      ) : (
        <button className="btn primary big" onClick={() => setEditing('new')}>+ Adicionar post</button>
      )}

      <div className="admin-list">
        {posts.map((p) => (
          <div key={p.id} className={`panel admin-post ${viewOf(p)}`}>
            <div className="thumb"><MediaViewer media={p.media} /></div>
            <div className="info">
              <div className="row-between">
                <strong>{formatDate(p.post_date, 'pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</strong>
                <span className={`chip ${viewOf(p)}`}>{STATUS_PT[viewOf(p)]}</span>
              </div>
              <div className="small muted">{FORMAT_PT[p.format]} · {p.media.length} arquivo(s){p.revision > 1 ? ` · versão ${p.revision}` : ''}</div>
              <p className="clamp small">{p.caption || <em className="muted">Sem legenda</em>}</p>
              {p.posted && p.post_url && (
                <a className="small" href={p.post_url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline' }}>Ver no Instagram ›</a>
              )}
              {p.client_comment && (
                <div className="note"><strong>Comentário do cliente</strong><p>{p.client_comment}</p></div>
              )}
              <div className="row-tight">
                <button className="btn" onClick={() => { setEditing(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Editar</button>
                <button className="btn ghost danger" onClick={() => remove(p)}>Excluir</button>
              </div>
            </div>
          </div>
        ))}
        {!posts.length && <p className="muted">Nenhum post ainda.</p>}
      </div>
    </>
  );
}

function PostForm({ clientId, post, onDone, onCancel }: { clientId: string; post: Post | null; onDone: () => void; onCancel: () => void }) {
  const [date, setDate] = useState(post?.post_date || new Date().toISOString().slice(0, 10));
  const [format, setFormat] = useState<Format>(post?.format || 'image');
  const [caption, setCaption] = useState(post?.caption || '');
  const [kept, setKept] = useState<ViewMedia[]>(post?.media || []);
  const [files, setFiles] = useState<File[]>([]);
  const [resubmit, setResubmit] = useState(post?.status === 'changes' && !post?.posted);
  const today = new Date().toISOString().slice(0, 10);
  const [posted, setPosted] = useState(post ? post.posted : false);
  const [postUrl, setPostUrl] = useState(post?.post_url || '');
  const [touchedPosted, setTouchedPosted] = useState(!!post);
  const [status, setStatus] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const tooBig = files.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) return alert(`"${tooBig.name}" passa de ${MAX_MB} MB. Exporte numa versão mais leve (ex.: 1080p, bitrate menor).`);
    if (!kept.length && !files.length) return alert('Adicione pelo menos uma imagem ou vídeo.');

    const supa = browserSupa();
    const uploaded: StoredMedia[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setStatus(`Enviando arquivo ${i + 1} de ${files.length}…`);
      const r = await fetch('/api/admin/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, filename: f.name }),
      });
      if (!r.ok) { setStatus(''); return alert('Erro ao preparar o upload.'); }
      const { path, token } = await r.json();
      const { error } = await supa.storage.from('mural').uploadToSignedUrl(path, token, f, { contentType: f.type });
      if (error) { setStatus(''); return alert('Erro no upload: ' + error.message); }
      uploaded.push({ path, type: f.type.startsWith('video') ? 'video' : 'image' });
    }

    setStatus('Salvando…');
    const media = [...kept.map(({ path, type }) => ({ path, type })), ...uploaded];
    const res = await fetch('/api/admin/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: post?.id, clientId, post_date: date, format, caption, media, resubmit, posted, post_url: postUrl }),
    });
    setStatus('');
    if (!res.ok) return alert('Erro ao salvar: ' + (await res.text()));
    onDone();
  }

  return (
    <form className="panel form" onSubmit={save}>
      <h3>{post ? 'Editar post' : 'Novo post'}</h3>
      <div className="row">
        <label>Data da postagem<input type="date" value={date} onChange={(e) => {
          setDate(e.target.value);
          // New post with a past date: assume it was already published (can be unticked).
          if (!touchedPosted) setPosted(e.target.value < today);
        }} required /></label>
        <label>Formato
          <select value={format} onChange={(e) => setFormat(e.target.value as Format)}>
            <option value="image">Imagem</option>
            <option value="carousel">Carrossel</option>
            <option value="video">Vídeo / Reels</option>
          </select>
        </label>
      </div>

      <label>Legenda<textarea rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Caption in English…" /></label>

      {kept.length > 0 && (
        <div className="kept">
          {kept.map((m) => (
            <div key={m.path} className="kept-item">
              {m.type === 'video' ? <video src={m.url} muted /> : <img src={m.url} alt="" />}
              <button type="button" onClick={() => setKept(kept.filter((k) => k.path !== m.path))} title="Remover">×</button>
            </div>
          ))}
        </div>
      )}

      <label>{post ? 'Adicionar/substituir arquivos' : 'Arquivos (imagens ou vídeos, na ordem do carrossel)'}
        <input type="file" multiple accept="image/*,video/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} />
      </label>
      <p className="small muted">Máximo {MAX_MB} MB por arquivo.</p>

      <div className="posted-box">
        <label className="check">
          <input type="checkbox" checked={posted} onChange={(e) => { setPosted(e.target.checked); setTouchedPosted(true); }} />
          Já foi postado (o cliente vê como &quot;Posted&quot;, sem botões de aprovar)
        </label>
        {posted && (
          <label>Link do post no Instagram (opcional)
            <input type="url" inputMode="url" placeholder="https://www.instagram.com/p/..." value={postUrl} onChange={(e) => setPostUrl(e.target.value)} />
          </label>
        )}
      </div>

      {post && !posted && (
        <label className="check">
          <input type="checkbox" checked={resubmit} onChange={(e) => setResubmit(e.target.checked)} />
          Enviar como nova versão (volta para &quot;pendente&quot; e o cliente aprova de novo)
        </label>
      )}

      <div className="actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={!!status}>Cancelar</button>
        <button className="btn primary" disabled={!!status}>{status || 'Salvar post'}</button>
      </div>
    </form>
  );
}
