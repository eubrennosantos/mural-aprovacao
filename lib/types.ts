export type MediaType = 'image' | 'video';
export type StoredMedia = { path: string; type: MediaType };
export type ViewMedia = StoredMedia & { url: string };

export type Format = 'image' | 'carousel' | 'video';
export type Status = 'pending' | 'approved' | 'changes';

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
};

export function formatDate(d: string, locale: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(d + 'T12:00:00Z').toLocaleDateString(locale, { timeZone: 'UTC', ...opts });
}
