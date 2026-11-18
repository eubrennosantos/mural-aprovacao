'use client';
import { useState } from 'react';
import type { ViewMedia } from '@/lib/types';

// `cover` is the post's cover image: the poster of a video, or the picture shown when there is no media.
export default function MediaViewer({ media, cover }: { media: ViewMedia[]; cover?: string | null }) {
  const [i, setI] = useState(0);
  if (!media.length) {
    // eslint-disable-next-line @next/next/no-img-element
    return cover ? <div className="media"><img src={cover} alt="" loading="lazy" /></div> : <div className="media empty">No media yet</div>;
  }
  const m = media[Math.min(i, media.length - 1)];
  return (
    <div className="media">
      {m.type === 'video' ? (
        <video key={m.url} src={m.url} poster={cover || undefined} controls playsInline preload={cover ? 'none' : 'metadata'} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={m.url} src={m.url} alt="" loading="lazy" />
      )}
      {media.length > 1 && (
        <>
          <button className="nav prev" onClick={() => setI((i - 1 + media.length) % media.length)} aria-label="Previous">‹</button>
          <button className="nav next" onClick={() => setI((i + 1) % media.length)} aria-label="Next">›</button>
          <div className="dots">
            {media.map((_, k) => (
              <span key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
