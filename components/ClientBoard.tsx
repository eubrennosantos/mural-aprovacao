'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from 'react';
import MediaViewer from './MediaViewer';
import ThemeToggle from './ThemeToggle';
import { BRAND } from '@/lib/brand';
import { formatDate, videoLabel, viewOf, type Post, type Status, type View } from '@/lib/types';

const FORMAT_LABEL = { image: 'Image', carousel: 'Carousel', video: 'Video' };
const STATUS_LABEL: Record<View, string> = { pending: 'In review', approved: 'Approved', changes: 'Changes requested', posted: 'Posted' };
type Filter = 'all' | View;
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'In review' },
  { key: 'changes', label: 'Changes' },
  { key: 'approved', label: 'Approved' },
  { key: 'posted', label: 'Posted' },
];

export default function ClientBoard({ token, clientName, initialPosts }: { token: string; clientName: string; initialPosts: Post[] }) {
  const [posts, setPosts] = useState(initialPosts);
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const c = { all: posts.length, pending: 0, approved: 0, changes: 0, posted: 0 };
    posts.forEach((p) => c[viewOf(p)]++);
    return c;
  }, [posts]);

  // Months that have posts (always including the current one once we know it).
  const [today, setToday] = useState<string | null>(null);
  const months = useMemo(() => {
    const set = new Set(posts.map((p) => p.post_date.slice(0, 7)));
    if (today) set.add(today.slice(0, 7));
    return [...set].sort();
  }, [posts, today]);

  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [openWeek, setOpenWeek] = useState<string | null>(null);

  // "Today" is the viewer's own date, so it is computed in the browser only.
  useEffect(() => {
    const t = localToday();
    setToday(t);
    const ym = t.slice(0, 7);
    const hasCurrent = posts.some((p) => p.post_date.startsWith(ym));
    const firstPending = posts.find((p) => !p.posted && p.status !== 'approved')?.post_date.slice(0, 7);
    const m = hasCurrent ? ym : firstPending || posts[0]?.post_date.slice(0, 7) || ym;
    setOpenMonth(m);
    setOpenWeek(defaultWeek(m, posts, t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const weeks = useMemo(() => (openMonth ? weeksOfMonth(openMonth) : []), [openMonth]);
  const week = weeks.find((w) => w.key === openWeek) || null;
  const weekPosts = week
    ? posts.filter((p) => p.post_date >= week.start && p.post_date <= week.end && (filter === 'all' || viewOf(p) === filter))
    : [];

  const done = counts.approved + counts.posted;
  const pct = counts.all ? Math.round((done / counts.all) * 100) : 0;

  function patch(id: string, data: Partial<Post>) {
    setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }

  function go(f: Filter) {
    setFilter(f);
    document.getElementById('calendar')?.scrollIntoView({ behavior: 'smooth' });
  }

  function pickMonth(m: string) {
    if (m === openMonth) return;
    setOpenMonth(m);
    setOpenWeek(defaultWeek(m, posts, today));
    setTimeout(() => document.getElementById('month-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30);
  }

  return (
    <div className="cb">
      {/* Global nav */}
      <nav className="cb-globalnav">
        <div className="cb-inner">
          <img src={BRAND.markWhite} alt={BRAND.name} className="cb-mark" />
          <span className="cb-globalnav-title">Content Approval</span>
          <span className="cb-globalnav-meta">{done}/{counts.all}</span>
        </div>
      </nav>

      {/* Local nav (sticky) */}
      <div className="cb-localnav">
        <div className="cb-inner">
          <img src={BRAND.wordmarkBlack} alt={BRAND.name} className="cb-wordmark logo-light" />
          <img src={BRAND.wordmarkWhite} alt={BRAND.name} className="cb-wordmark logo-dark" />
          <div className="cb-localnav-right">
          <div className="cb-filters" role="tablist">
            {FILTERS.map((f) => (
              <button key={f.key} role="tab" aria-selected={filter === f.key} className={filter === f.key ? 'on' : ''} onClick={() => go(f.key)}>
                {f.label}<span>{counts[f.key]}</span>
              </button>
            ))}
          </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Hero */}
      <header className="cb-hero">
        <p className="cb-eyebrow">{clientName} · Content Calendar</p>
        <h1>{BRAND.heroTitle}</h1>
        <p className="cb-hero-text">{BRAND.heroText}</p>
        <div className="cb-hero-ctas">
          <button className="cb-btn light" onClick={() => go(counts.pending ? 'pending' : 'all')}>
            {counts.pending ? `Review ${counts.pending} post${counts.pending > 1 ? 's' : ''}` : 'View calendar'}
          </button>
          <button className="cb-link light" onClick={() => go('approved')}>See approved ›</button>
        </div>
        <div className="cb-stats">
          <Stat value={counts.all} label="Posts planned" />
          <Stat value={counts.pending} label="In review" />
          <Stat value={counts.changes} label="Changes requested" />
          <Stat value={counts.approved} label="Approved" />
          <Stat value={counts.posted} label="Posted" />
        </div>
        <div className="cb-progress"><span style={{ width: `${pct}%` }} /></div>
      </header>

      {/* Calendar */}
      <main id="calendar" className="cb-calendar">
        <section className="cb-month">
          <div className="cb-inner">
            <h2 className="cb-month-title">Calendar. <span>Pick a month to see its weeks.</span></h2>

            {/* Month blocks */}
            <div className="cb-months">
              {months.map((m) => {
                const list = posts.filter((p) => p.post_date.startsWith(m));
                const ok = list.filter((p) => viewOf(p) === 'approved').length;
                const rev = list.filter((p) => viewOf(p) === 'pending').length;
                const chg = list.filter((p) => viewOf(p) === 'changes').length;
                const pst = list.filter((p) => p.posted).length;
                const state = !today ? '' : m < today.slice(0, 7) ? 'past' : m === today.slice(0, 7) ? 'current' : 'future';
                return (
                  <button key={m} className={`cb-mblock ${state} ${m === openMonth ? 'open' : ''}`} onClick={() => pickMonth(m)} aria-expanded={m === openMonth}>
                    <div className="cb-mblock-top">
                      <span>{m.slice(0, 4)}</span>
                      {state === 'current' && <span className="cb-badge">Now</span>}
                    </div>
                    <strong>{formatDate(m + '-01', 'en-US', { month: 'long' })}</strong>
                    <span className="cb-mblock-count">{list.length ? `${list.length} post${list.length > 1 ? 's' : ''}` : 'No posts yet'}</span>
                    <div className="cb-mbar"><span style={{ width: `${list.length ? ((ok + pst) / list.length) * 100 : 0}%` }} /></div>
                    <span className="cb-mblock-detail">{pst ? `${pst} posted · ` : ''}{ok} approved · {rev} in review{chg ? ` · ${chg} change${chg > 1 ? 's' : ''}` : ''}</span>
                  </button>
                );
              })}
            </div>

            {/* Month panel with weeks */}
            {openMonth && (
              <div id="month-panel" className="cb-panel">
                <div className="cb-panel-head">
                  <h3>{formatDate(openMonth + '-01', 'en-US', { month: 'long', year: 'numeric' })}</h3>
                  <div className="cb-legend">
                    <span><i className="lg past" />Past</span>
                    <span><i className="lg current" />This week</span>
                    <span><i className="lg future" />Upcoming</span>
                  </div>
                </div>

                <div className="cb-weeks" role="tablist">
                  {weeks.map((w, idx) => {
                    const list = posts.filter((p) => p.post_date >= w.start && p.post_date <= w.end);
                    const ok = list.filter((p) => p.posted || p.status === 'approved').length;
                    const open = list.length - ok;
                    const state = !today ? 'future' : w.end < today ? 'past' : w.start <= today ? 'current' : 'future';
                    return (
                      <button
                        key={w.key}
                        role="tab"
                        aria-selected={w.key === openWeek}
                        className={`cb-week ${state} ${w.key === openWeek ? 'sel' : ''}`}
                        onClick={() => setOpenWeek(w.key)}
                      >
                        <span className="cb-week-label">Week {idx + 1}{state === 'current' ? ' · Now' : ''}</span>
                        <strong>{rangeLabel(w.start, w.end)}</strong>
                        <span className="cb-week-meta">
                          {!list.length ? 'No posts' : open === 0 ? (list.every((p) => p.posted) ? `✓ ${list.length} posted` : `✓ ${list.length} done`) : `${list.length} post${list.length > 1 ? 's' : ''} · ${open} open`}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {week && (
                  <div className="cb-week-posts">
                    <h4>
                      {rangeLabel(week.start, week.end, true)}.{' '}
                      <span>{weekPosts.length ? `${weekPosts.length} post${weekPosts.length > 1 ? 's' : ''}${filter !== 'all' ? ` · ${STATUS_LABEL[filter as View].toLowerCase()}` : ''}.` : filter === 'all' ? 'Nothing scheduled this week.' : 'Nothing in this filter.'}</span>
                    </h4>
                    {weekPosts.length > 0 && (
                      <div className="cb-grid">
                        {weekPosts.map((p) => (
                          <Tile key={p.id} post={p} token={token} onChange={(d) => patch(p.id, d)} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="cb-footer">
        <div className="cb-inner">
          <img src={BRAND.markBlack} alt="" className="cb-footer-mark logo-light" />
          <img src={BRAND.markWhite} alt="" className="cb-footer-mark logo-dark" />
          <p>Your answers are saved automatically. You can change a decision at any time while a post is in review.</p>
          <div className="cb-footer-row">
            <span>© {new Date().getFullYear()} {BRAND.name}. Private preview — please do not share this link.</span>
            <span>{BRAND.credit}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="cb-stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function Tile({ post, token, onChange }: { post: Post; token: string; onChange: (d: Partial<Post>) => void }) {
  const [writing, setWriting] = useState(false);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const long = post.caption.length > 200;

  async function send(decision: Status, text?: string) {
    setBusy(true);
    const res = await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, postId: post.id, decision, comment: text }),
    });
    setBusy(false);
    if (!res.ok) return alert('Could not save. Please try again.');
    onChange(await res.json());
    setWriting(false);
    setComment('');
  }

  return (
    <article className={`cb-tile ${viewOf(post)}`}>
      <div className="cb-media-wrap">
        <MediaViewer media={post.media} cover={post.cover_url} />
        {post.video_url && !post.media.some((m) => m.type === 'video') && (
          <a className="cb-play" href={post.video_url} target="_blank" rel="noopener noreferrer" aria-label={videoLabel(post.video_url)}>
            <span className="cb-play-btn"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg></span>
            <span className="cb-play-label">{videoLabel(post.video_url)}</span>
          </a>
        )}
      </div>
      <div className="cb-tile-body">
        <div className="cb-tile-meta">
          <span>{formatDate(post.post_date, 'en-US', { weekday: 'long' })}</span>
          <span className={`cb-status ${viewOf(post)}`}>{(post.posted || post.status === 'approved') && '✓ '}{STATUS_LABEL[viewOf(post)]}</span>
        </div>
        <h3>{formatDate(post.post_date, 'en-US', { month: 'long', day: 'numeric' })}</h3>
        <p className="cb-tile-format">
          {FORMAT_LABEL[post.format]}{post.media.length > 1 ? ` · ${post.media.length} slides` : ''}
          {post.revision > 1 && <em> · New version {post.revision}</em>}
        </p>

        {post.caption && (
          <div className="cb-caption">
            <p className={long && !open ? 'clamp' : ''}>{post.caption}</p>
            {long && <button className="cb-link" onClick={() => setOpen(!open)}>{open ? 'Show less' : 'Read full caption ›'}</button>}
          </div>
        )}

        {!post.posted && post.client_comment && (post.status === 'changes' || post.revision > 1) && (
          <div className="cb-note">
            <span>{post.status === 'changes' ? 'Your request' : 'Your previous request'}</span>
            <p>{post.client_comment}</p>
          </div>
        )}

        {post.video_url && (
          <a className="cb-watch" href={post.video_url} target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
            {videoLabel(post.video_url)} ↗
          </a>
        )}

        <div className="cb-tile-actions">
          {post.posted ? (
            post.post_url ? (
              <a className="cb-btn outline cb-ig" href={post.post_url} target="_blank" rel="noopener noreferrer">View on Instagram ›</a>
            ) : (
              <span className="cb-posted-note">Published</span>
            )
          ) : writing ? (
            <div className="cb-write">
              <textarea autoFocus placeholder="What should we change?" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
              <div className="cb-row">
                <button className="cb-link" onClick={() => setWriting(false)} disabled={busy}>Cancel</button>
                <button className="cb-btn" onClick={() => send('changes', comment)} disabled={busy || !comment.trim()}>Send request</button>
              </div>
            </div>
          ) : post.status === 'pending' ? (
            <div className="cb-row">
              <button className="cb-btn outline" onClick={() => setWriting(true)} disabled={busy}>Request changes</button>
              <button className="cb-btn" onClick={() => send('approved')} disabled={busy}>Approve</button>
            </div>
          ) : (
            <button className="cb-link" onClick={() => send('pending')} disabled={busy}>Change my answer ›</button>
          )}
        </div>
      </div>
    </article>
  );
}

/* ───────── Week helpers (dates as YYYY-MM-DD strings, Monday-first weeks) ───────── */
type Week = { key: string; start: string; end: string };

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function weeksOfMonth(ym: string): Week[] {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const cursor = new Date(first);
  cursor.setUTCDate(cursor.getUTCDate() - ((cursor.getUTCDay() + 6) % 7)); // back to Monday
  const out: Week[] = [];
  while (cursor <= last) {
    const s = cursor < first ? first : new Date(cursor);
    const sunday = new Date(cursor);
    sunday.setUTCDate(sunday.getUTCDate() + 6);
    const e = sunday > last ? last : sunday;
    out.push({ key: iso(cursor), start: iso(s), end: iso(e) });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }
  return out;
}

function defaultWeek(ym: string, posts: Post[], today: string | null) {
  const ws = weeksOfMonth(ym);
  const cur = today && ws.find((w) => w.start <= today && today <= w.end);
  if (cur) return cur.key;
  const withOpen = ws.find((w) => posts.some((p) => p.post_date >= w.start && p.post_date <= w.end && !p.posted && p.status !== 'approved'));
  const withAny = ws.find((w) => posts.some((p) => p.post_date >= w.start && p.post_date <= w.end));
  return (withOpen || withAny || ws[0]).key;
}

function rangeLabel(start: string, end: string, long = false) {
  const opts: Intl.DateTimeFormatOptions = { month: long ? 'long' : 'short', day: 'numeric' };
  if (start === end) return formatDate(start, 'en-US', opts);
  const a = formatDate(start, 'en-US', opts);
  const b = start.slice(5, 7) === end.slice(5, 7) ? end.slice(8).replace(/^0/, '') : formatDate(end, 'en-US', opts);
  return `${a} – ${b}`;
}
