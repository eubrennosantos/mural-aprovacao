export type MediaType = 'image' | 'video';
export type StoredMedia = { path: string; type: MediaType };
export type ViewMedia = StoredMedia & { url: string };

export type Format = 'image' | 'carousel' | 'video';
export type Status = 'pending' | 'approved' | 'changes';
export type View = Status | 'posted';

export type Post = {
  id: string;
  client_id: string;
  post_date: string; // YYYY-MM-DD
  format: Format;
  media: ViewMedia[];
  caption: string;
  status: Status;
  client_comment: string | null;
  revision: number;
  reviewed_at: string | null;
  posted: boolean;
  post_url: string | null;
  cover_path: string | null;
  cover_url: string | null;
};

// What the post looks like to the client: published posts are "posted" regardless of review status.
export function viewOf(p: Pick<Post, 'posted' | 'status'>): View {
  return p.posted ? 'posted' : p.status;
}

export function formatDate(d: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString(locale, { timeZone: 'UTC', ...opts });
}
