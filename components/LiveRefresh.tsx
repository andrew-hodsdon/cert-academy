'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Re-renders the current server page whenever course content changes in the database. */
export function LiveRefresh() {
  const router = useRouter();
  const [flash, setFlash] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const es = new EventSource('/api/live');
    let pending: ReturnType<typeof setTimeout> | null = null;
    es.addEventListener('content', (e) => {
      // A course load fires one event per table; coalesce them into one refresh.
      if (pending) clearTimeout(pending);
      pending = setTimeout(() => {
        router.refresh();
        let table = 'content';
        try { table = JSON.parse((e as MessageEvent).data).table ?? table; } catch { /* keep default */ }
        setFlash(`Content updated (${table})`);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setFlash(null), 4000);
      }, 400);
    });
    return () => {
      es.close();
      if (pending) clearTimeout(pending);
    };
  }, [router]);

  return flash ? <div className="live-flash" role="status">{flash}</div> : null;
}
